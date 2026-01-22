"""
Resume Parser - Extracts profile data from resume using OpenAI GPT Vision API

Takes a resume file (PDF or image) and uses GPT-4o-mini Vision to extract:
- Basic information (name)
- Skills with competency ratings
- Work experience, certifications, and projects

Usage:
    python resume_parser.py <file_path> [--api-key KEY]

Output: JSON to stdout

Note: Uses requests library instead of openai SDK to avoid asyncio issues on Windows
"""

import sys
import os
import json
import base64
import argparse
import traceback
from pathlib import Path
from typing import Optional
from datetime import datetime
import requests

# Debug logging helper - always outputs to stderr so stdout stays clean for JSON
DEBUG = os.getenv('RESUME_PARSER_DEBUG', '1') == '1'  # Enable by default for troubleshooting

def debug_log(message: str, data: any = None):
    """Log debug message to stderr with timestamp"""
    if DEBUG:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        log_msg = f"[DEBUG {timestamp}] {message}"
        if data is not None:
            if isinstance(data, dict) or isinstance(data, list):
                log_msg += f"\n{json.dumps(data, indent=2, default=str)[:1000]}"
            else:
                log_msg += f" | {str(data)[:500]}"
        print(log_msg, file=sys.stderr)

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
    debug_log("Loaded .env file")
except ImportError:
    debug_log("python-dotenv not installed, skipping .env load")

# Skill categories mapping (matches SkillContext.jsx)
SKILL_CATEGORIES = {
    "Design": ["Photoshop", "Illustrator", "InDesign", "Figma", "Sketch", "Canva", "Adobe XD",
               "After Effects", "Premiere Pro", "Adobe Creative Suite", "CorelDRAW", "Lightroom",
               "Blender", "3ds Max", "Maya", "Cinema 4D", "AutoCAD", "SketchUp", "Graphic Design",
               "Web Design", "Motion Graphics", "Video Editing", "Animation", "Typography", 
               "Branding", "Layout Design", "Print Design"],
    "Prototyping": ["Figma", "Adobe XD", "Sketch", "InVision", "Axure", "Balsamiq", 
                   "Marvel", "Principle", "Framer", "Proto.io", "Wireframing", "Mockups"],
    "Tools": ["Git", "GitHub", "GitLab", "Jira", "Trello", "Asana", "Slack", "VS Code",
              "Docker", "Kubernetes", "Jenkins", "AWS", "Azure", "GCP", "Linux", "Postman",
              "Notion", "Confluence", "Microsoft Office", "Google Workspace"],
    "Research": ["User Research", "Market Research", "Data Analysis", "Competitive Analysis",
                 "Survey Design", "A/B Testing", "Usability Testing", "Analytics", 
                 "Google Analytics", "Qualitative Research", "Quantitative Research"],
    "Communication": ["Public Speaking", "Technical Writing", "Documentation", "Presentation",
                      "Client Communication", "Stakeholder Management", "Team Collaboration",
                      "English", "Filipino", "Mandarin", "Spanish"],
    "Programming": ["Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "PHP", "Ruby", 
                   "Go", "Rust", "Swift", "Kotlin", "Scala", "R", "MATLAB", "SQL", "HTML", 
                   "CSS", "React", "Angular", "Vue", "Node.js", "Django", "Flask", "Spring", 
                   ".NET", "Laravel", "Express", "FastAPI", "Next.js", "Tailwind CSS"],
    "Data Analysis": ["Excel", "Tableau", "Power BI", "SQL", "Python", "R", "SPSS", "SAS",
                      "Data Visualization", "Statistical Analysis", "Machine Learning",
                      "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-learn"],
    "Leadership": ["Project Management", "Team Leadership", "Agile", "Scrum", "Kanban",
                   "People Management", "Strategic Planning", "Decision Making", "Mentoring",
                   "Conflict Resolution", "Time Management", "Budget Management"]
}

# Flatten all skills for reference
ALL_SKILLS = []
for category, skills in SKILL_CATEGORIES.items():
    ALL_SKILLS.extend(skills)
ALL_SKILLS = list(set(ALL_SKILLS))


def convert_pdf_to_images(pdf_path: str) -> list[str]:
    """Convert PDF pages to base64 encoded PNG images using PyMuPDF"""
    debug_log(f"Converting PDF to images: {pdf_path}")
    try:
        import fitz  # PyMuPDF
        debug_log(f"PyMuPDF (fitz) version: {fitz.version}")
        
        doc = fitz.open(pdf_path)
        debug_log(f"PDF opened successfully, pages: {len(doc)}")
        base64_images = []
        
        # Convert first 3 pages max to save tokens
        for page_num in range(min(3, len(doc))):
            debug_log(f"Processing page {page_num + 1}")
            page = doc[page_num]
            # Render at 150 DPI for good quality
            mat = fitz.Matrix(150/72, 150/72)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            base64_str = base64.b64encode(img_bytes).decode("utf-8")
            base64_images.append(base64_str)
            debug_log(f"Page {page_num + 1} converted, base64 length: {len(base64_str)}")
        
        doc.close()
        debug_log(f"PDF conversion complete, {len(base64_images)} images")
        return base64_images
    except ImportError as e:
        debug_log(f"PyMuPDF not installed: {e}")
        print(f"Error: PyMuPDF (fitz) not installed. Run: pip install PyMuPDF", file=sys.stderr)
        return []
    except Exception as e:
        debug_log(f"Error converting PDF: {e}")
        debug_log(f"Traceback: {traceback.format_exc()}")
        print(f"Error converting PDF: {e}", file=sys.stderr)
        return []


def encode_image_to_base64(image_path: str) -> str:
    """Encode an image file to base64"""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def get_image_media_type(file_path: str) -> str:
    """Get the media type for an image based on extension"""
    ext = Path(file_path).suffix.lower()
    media_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    return media_types.get(ext, "image/png")


def parse_resume_with_gpt(file_path: str, api_key: Optional[str] = None) -> dict:
    """
    Parse resume using GPT-4o-mini Vision API
    
    Args:
        file_path: Path to resume file (PDF, PNG, JPG, etc.)
        api_key: OpenAI API key (defaults to env var)
    
    Returns:
        Parsed profile data as dictionary
    """
    debug_log("="*60)
    debug_log(f"STARTING RESUME PARSE: {file_path}")
    debug_log("="*60)
    
    # Check if file exists
    if not os.path.exists(file_path):
        debug_log(f"ERROR: File not found: {file_path}")
        return {"error": f"File not found: {file_path}"}
    
    file_size = os.path.getsize(file_path)
    debug_log(f"File size: {file_size} bytes ({file_size / 1024:.1f} KB)")
    
    # Get API key
    api_key = api_key or os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your-api-key-here":
        debug_log("ERROR: OpenAI API key not configured")
        return {"error": "OpenAI API key not configured. Please set OPENAI_API_KEY in .env file."}
    debug_log(f"API key present: {api_key[:8]}...{api_key[-4:]} (length: {len(api_key)})")
    
    # Prepare images - convert PDF to images, or encode image directly
    file_ext = Path(file_path).suffix.lower()
    debug_log(f"File extension: {file_ext}")
    
    if file_ext == ".pdf":
        # Convert PDF pages to images using PyMuPDF
        debug_log("Processing as PDF...")
        base64_images = convert_pdf_to_images(file_path)
        if not base64_images:
            debug_log("ERROR: Failed to convert PDF to images")
            return {"error": "Failed to convert PDF to images. Please try uploading an image instead."}
        media_type = "image/png"
    else:
        # Direct image upload
        debug_log(f"Processing as image ({file_ext})...")
        try:
            base64_images = [encode_image_to_base64(file_path)]
            debug_log(f"Image encoded, base64 length: {len(base64_images[0])}")
        except Exception as e:
            debug_log(f"ERROR encoding image: {e}")
            return {"error": f"Failed to encode image: {str(e)}"}
        media_type = get_image_media_type(file_path)
    
    debug_log(f"Media type: {media_type}, Image count: {len(base64_images)}")
    
    # Build the content array with images
    content = [
        {
            "type": "text",
            "text": f"""Analyze this resume and extract the following information in JSON format:

1. **Basic Information**: First name and last name of the person

2. **Skills**: List all skills mentioned. For each skill, also estimate a competency level (1-100) based on:
   - Years of experience mentioned (more years = higher rating)
   - Context clues (e.g., "expert in", "proficient", "beginner" etc.)
   - If no experience level mentioned, use 50 as default
   
   Map skills to these categories: {list(SKILL_CATEGORIES.keys())}
   
   Here are example skills per category for reference:
   {json.dumps(SKILL_CATEGORIES, indent=2)}

3. **Credentials**: Extract work experience, certifications, and projects with:
   - type: "work", "certificate", or "project"
   - title: Job title or credential name
   - organization: Company or issuing organization
   - description: Brief description
   - startDate: Start date (format: YYYY-MM-DD or null)
   - endDate: End date (format: YYYY-MM-DD or null, null if "Present")

Return ONLY valid JSON in this exact structure:
{{
    "firstName": "string",
    "lastName": "string",
    "skills": [
        {{"name": "skill name", "category": "category name", "rating": 75}}
    ],
    "credentials": [
        {{
            "type": "work|certificate|project",
            "title": "string",
            "organization": "string", 
            "description": "string",
            "startDate": "YYYY-MM-DD or null",
            "endDate": "YYYY-MM-DD or null"
        }}
    ],
    "competencyRatings": {{
        "Design": 0-100,
        "Prototyping": 0-100,
        "Tools": 0-100,
        "Research": 0-100,
        "Communication": 0-100,
        "Programming": 0-100,
        "Data Analysis": 0-100,
        "Leadership": 0-100
    }}
}}

For competencyRatings, calculate an aggregate score (0-100) for each category based on:
- Number of skills in that category
- Average rating of skills in that category
- Relevant work experience
- Set to 0 if no skills found in that category"""
        }
    ]
    
    # Add all images to content (multiple pages for PDFs)
    for base64_img in base64_images:
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{media_type};base64,{base64_img}",
                "detail": "high"
            }
        })
    
    try:
        # Use requests library directly instead of openai SDK (avoids asyncio issues on Windows)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        model = "gpt-5-mini"
        debug_log(f"Using model: {model}")
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": content
                }
            ],
            "max_completion_tokens": 16000
        }
        
        debug_log("Sending request to OpenAI API...")
        debug_log(f"Payload size: {len(json.dumps(payload))} chars (prompt + images)")
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=120
        )
        
        debug_log(f"API Response status: {response.status_code}")
        
        if response.status_code != 200:
            debug_log(f"API ERROR: {response.text[:1000]}")
            return {"error": f"OpenAI API error: {response.status_code} - {response.text}"}
        
        response_data = response.json()
        debug_log("API Response received successfully")
        
        # Log usage info if available
        if "usage" in response_data:
            debug_log(f"Token usage: {response_data['usage']}")
        
        # Check if response has expected structure
        if "choices" not in response_data or len(response_data["choices"]) == 0:
            debug_log(f"ERROR: Unexpected API response structure")
            debug_log(f"Response keys: {list(response_data.keys())}")
            return {"error": f"Unexpected API response structure: {json.dumps(response_data)[:500]}"}
        
        if "message" not in response_data["choices"][0]:
            debug_log(f"ERROR: No message in response")
            return {"error": f"No message in response: {json.dumps(response_data)[:500]}"}
            
        content = response_data["choices"][0]["message"].get("content")
        if not content:
            # Check for refusal
            refusal = response_data["choices"][0]["message"].get("refusal")
            if refusal:
                debug_log(f"API REFUSED: {refusal}")
                return {"error": f"API refused request: {refusal}"}
            debug_log("ERROR: Empty content in response")
            return {"error": f"Empty content in response: {json.dumps(response_data)[:500]}"}
        
        debug_log(f"Response content length: {len(content)} chars")
        debug_log(f"Response preview: {content[:200]}...")
        
        # Parse response
        response_text = content.strip()
        
        # Clean up response if it has markdown code blocks
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first and last lines (```json and ```)
            lines = [l for l in lines if not l.startswith("```")]
            response_text = "\n".join(lines)
        
        # Parse JSON
        debug_log("Parsing JSON response...")
        try:
            parsed_data = json.loads(response_text)
            debug_log(f"JSON parsed successfully, keys: {list(parsed_data.keys())}")
        except json.JSONDecodeError as e:
            debug_log(f"JSON PARSE ERROR at position {e.pos}: {e.msg}")
            debug_log(f"Problematic text around error: ...{response_text[max(0,e.pos-50):e.pos+50]}...")
            return {"error": f"Failed to parse GPT response as JSON: {str(e)}", "raw_response": response_text[:500]}
        
        # Validate and set defaults
        debug_log("Validating and setting defaults...")
        
        # Log what we found
        debug_log(f"Found firstName: {parsed_data.get('firstName', '(missing)')}")
        debug_log(f"Found lastName: {parsed_data.get('lastName', '(missing)')}")
        debug_log(f"Found skills count: {len(parsed_data.get('skills', []))}")
        debug_log(f"Found credentials count: {len(parsed_data.get('credentials', []))}")
        debug_log(f"Found competencyRatings: {parsed_data.get('competencyRatings', '(missing)')}")
        
        result = {
            "firstName": parsed_data.get("firstName", ""),
            "lastName": parsed_data.get("lastName", ""),
            "skills": parsed_data.get("skills", []),
            "credentials": parsed_data.get("credentials", []),
            "competencyRatings": {
                "Design": 0,
                "Prototyping": 0,
                "Tools": 0,
                "Research": 0,
                "Communication": 0,
                "Programming": 0,
                "Data Analysis": 0,
                "Leadership": 0,
                **parsed_data.get("competencyRatings", {})
            }
        }
        
        debug_log("="*60)
        debug_log("RESUME PARSE COMPLETE - SUCCESS")
        debug_log(f"Final result skills: {[s.get('name') for s in result['skills'][:5]]}...")
        debug_log("="*60)
        
        return result
        
    except json.JSONDecodeError as e:
        debug_log(f"JSON DECODE ERROR: {e}")
        return {"error": f"Failed to parse GPT response as JSON: {str(e)}", "raw_response": response_text[:500]}
    except requests.exceptions.Timeout:
        debug_log("ERROR: Request timed out after 120 seconds")
        return {"error": "Request to OpenAI API timed out. Please try again."}
    except requests.exceptions.ConnectionError as e:
        debug_log(f"CONNECTION ERROR: {e}")
        return {"error": f"Could not connect to OpenAI API: {str(e)}"}
    except Exception as e:
        debug_log(f"UNEXPECTED ERROR: {type(e).__name__}: {e}")
        debug_log(f"Traceback: {traceback.format_exc()}")
        return {"error": f"GPT API error: {str(e)}"}


def main():
    parser = argparse.ArgumentParser(description="Parse resume using GPT Vision")
    parser.add_argument("file_path", help="Path to resume file (PDF, PNG, JPG)")
    parser.add_argument("--api-key", help="OpenAI API key (defaults to OPENAI_API_KEY env var)")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    parser.add_argument("--no-debug", action="store_true", help="Disable debug logging")
    
    args = parser.parse_args()
    
    # Handle debug flag
    global DEBUG
    if args.debug:
        DEBUG = True
    elif args.no_debug:
        DEBUG = False
    
    debug_log("="*60)
    debug_log("RESUME PARSER STARTED")
    debug_log(f"Python version: {sys.version}")
    debug_log(f"Working directory: {os.getcwd()}")
    debug_log(f"Script path: {__file__}")
    debug_log(f"File path argument: {args.file_path}")
    debug_log(f"API key provided via arg: {bool(args.api_key)}")
    debug_log("="*60)
    
    # Validate file exists
    if not os.path.exists(args.file_path):
        debug_log(f"ERROR: File not found: {args.file_path}")
        print(json.dumps({"error": f"File not found: {args.file_path}"}))
        sys.exit(1)
    
    # Validate file type
    valid_extensions = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"]
    file_ext = Path(args.file_path).suffix.lower()
    if file_ext not in valid_extensions:
        debug_log(f"ERROR: Invalid file type: {file_ext}")
        print(json.dumps({"error": f"Invalid file type: {file_ext}. Supported: {valid_extensions}"}))
        sys.exit(1)
    
    debug_log(f"File validated: {args.file_path} ({file_ext})")
    
    # Parse resume
    result = parse_resume_with_gpt(args.file_path, args.api_key)
    
    # Output JSON (to stdout - this is what PHP reads)
    print(json.dumps(result, indent=2))
    
    # Exit with error code if there was an error
    if "error" in result:
        debug_log(f"EXITING WITH ERROR: {result.get('error')}")
        sys.exit(1)
    else:
        debug_log("EXITING SUCCESSFULLY")


if __name__ == "__main__":
    main()
