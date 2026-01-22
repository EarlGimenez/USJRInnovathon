"""
Course Scraper - Scrapes course data from Udemy and Coursera

Takes a search query and scrapes course information including:
- Title, description, price (in PHP peso), rating, review count
- Direct URL to course page
- Provider information

Usage:
    python course_scraper.py <query> [--limit 5] [--provider udemy|coursera|all]
    python course_scraper.py "UI UX design" --limit 5 --provider all
    python course_scraper.py --batch  # Scrape all skill categories and cache

Output: JSON to stdout or saved to cache files

Note: Uses requests + BeautifulSoup for scraping. Results may vary based on
      Udemy/Coursera page structure changes.
"""

import sys
import os
import json
import argparse
import random
import re
import time
from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus, urljoin

import requests
from bs4 import BeautifulSoup

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Cache directory for pre-scraped courses
CACHE_DIR = Path(__file__).parent / "course_cache"

# Skill categories and their search queries (matches SkillContext.jsx)
SKILL_SEARCH_QUERIES = {
    "Design": ["UI UX design", "graphic design", "web design"],
    "Prototyping": ["figma prototyping", "wireframing", "adobe xd"],
    "Tools": ["git github", "docker", "AWS cloud"],
    "Research": ["user research", "data analysis", "market research"],
    "Communication": ["public speaking", "technical writing", "presentation skills"],
    "Programming": ["python programming", "javascript", "web development"],
    "Data Analysis": ["data analysis python", "SQL database", "tableau"],
    "Leadership": ["project management", "agile scrum", "team leadership"]
}

# USD to PHP conversion rate (approximate)
USD_TO_PHP = 56.0

# User agent to mimic browser
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def scrape_udemy(query: str, limit: int = 5) -> list[dict]:
    """
    Scrape Udemy search results for courses
    
    Args:
        query: Search query string
        limit: Maximum number of courses to return
    
    Returns:
        List of course dictionaries
    """
    courses = []
    encoded_query = quote_plus(query)
    url = f"https://www.udemy.com/courses/search/?q={encoded_query}&sort=relevance"
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Udemy uses data attributes and specific class patterns
        # Look for course cards - they typically have specific data attributes
        course_cards = soup.select('[data-purpose="course-card-container"]')
        
        if not course_cards:
            # Alternative selector - look for course items in search results
            course_cards = soup.select('.course-card--container--1QM2W')
        
        if not course_cards:
            # Try another pattern - course list items
            course_cards = soup.select('[class*="course-card"]')[:limit]
        
        for card in course_cards[:limit]:
            try:
                course = parse_udemy_card(card, query)
                if course:
                    courses.append(course)
            except Exception as e:
                print(f"Error parsing Udemy card: {e}", file=sys.stderr)
                continue
        
        # If we couldn't parse from HTML, try the API approach
        if not courses:
            courses = scrape_udemy_api(query, limit)
            
    except requests.RequestException as e:
        print(f"Error fetching Udemy: {e}", file=sys.stderr)
        # Try API fallback
        courses = scrape_udemy_api(query, limit)
    
    return courses


def parse_udemy_card(card, skill: str) -> Optional[dict]:
    """Parse a single Udemy course card element"""
    
    # Try to find title
    title_elem = card.select_one('[data-purpose="course-title-url"] a')
    if not title_elem:
        title_elem = card.select_one('h3 a') or card.select_one('.course-card--course-title a')
    
    if not title_elem:
        return None
    
    title = title_elem.get_text(strip=True)
    href = title_elem.get('href', '')
    course_url = urljoin("https://www.udemy.com", href) if href else None
    
    # Get description/headline
    desc_elem = card.select_one('[data-purpose="course-headline"]')
    if not desc_elem:
        desc_elem = card.select_one('.course-card--course-headline')
    description = desc_elem.get_text(strip=True) if desc_elem else ""
    
    # Get price
    price_elem = card.select_one('[data-purpose="course-price-text"] span span')
    if not price_elem:
        price_elem = card.select_one('.price-text--price-part--Tu6MH')
    
    price_php = "₱549"  # Default price
    is_free = False
    
    if price_elem:
        price_text = price_elem.get_text(strip=True)
        if "free" in price_text.lower():
            price_php = "Free"
            is_free = True
        else:
            # Extract numeric value and convert
            price_match = re.search(r'[\$₱]?([\d,]+\.?\d*)', price_text)
            if price_match:
                try:
                    price_val = float(price_match.group(1).replace(',', ''))
                    # Assume USD if $ or no currency symbol
                    if '$' in price_text or '₱' not in price_text:
                        price_val = price_val * USD_TO_PHP
                    price_php = f"₱{int(price_val)}"
                except ValueError:
                    pass
    
    # Get rating
    rating_elem = card.select_one('[data-purpose="rating-number"]')
    if not rating_elem:
        rating_elem = card.select_one('.star-rating--rating-number')
    
    rating = 4.5  # Default
    if rating_elem:
        try:
            rating = float(rating_elem.get_text(strip=True))
        except ValueError:
            pass
    
    # Get review count
    reviews_elem = card.select_one('[data-purpose="rating-number"] + span')
    if not reviews_elem:
        reviews_elem = card.select_one('.course-card--reviews-text')
    
    reviews = 10000  # Default
    if reviews_elem:
        reviews_text = reviews_elem.get_text(strip=True)
        reviews_match = re.search(r'([\d,]+\.?\d*)\s*[Kk]?', reviews_text)
        if reviews_match:
            try:
                reviews_val = float(reviews_match.group(1).replace(',', ''))
                if 'k' in reviews_text.lower():
                    reviews_val *= 1000
                reviews = int(reviews_val)
            except ValueError:
                pass
    
    # Get image
    img_elem = card.select_one('img[src*="udemy"]')
    image = img_elem.get('src') if img_elem else None
    
    return {
        "id": f"udemy_{hash(title) % 100000}",
        "title": title,
        "description": description[:200] if description else f"Learn {skill} with this comprehensive course",
        "provider": "Udemy",
        "providerLogo": "https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg",
        "url": course_url,
        "image": image,
        "price": price_php,
        "isFree": is_free,
        "rating": round(rating, 1),
        "reviews": reviews,
        "skill": skill,
        "type": "online"
    }


def scrape_udemy_api(query: str, limit: int = 5) -> list[dict]:
    """
    Fallback: Use Udemy's public API endpoint
    """
    courses = []
    encoded_query = quote_plus(query)
    
    # Udemy public API (may be rate limited)
    api_url = f"https://www.udemy.com/api-2.0/courses/?search={encoded_query}&page_size={limit}&ordering=relevance"
    
    try:
        response = requests.get(api_url, headers=HEADERS, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            
            for course in results[:limit]:
                price_detail = course.get('price_detail', {})
                price = price_detail.get('price_string', '₱549')
                
                # Convert USD to PHP if needed
                if '$' in str(price):
                    try:
                        usd_val = float(re.search(r'[\d.]+', str(price)).group())
                        price = f"₱{int(usd_val * USD_TO_PHP)}"
                    except:
                        price = "₱549"
                
                courses.append({
                    "id": f"udemy_{course.get('id', random.randint(1000, 99999))}",
                    "title": course.get('title', 'Course'),
                    "description": course.get('headline', '')[:200],
                    "provider": "Udemy",
                    "providerLogo": "https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg",
                    "url": f"https://www.udemy.com{course.get('url', '')}",
                    "image": course.get('image_480x270') or course.get('image_240x135'),
                    "price": price,
                    "isFree": course.get('is_free', False),
                    "rating": round(course.get('rating', 4.5), 1),
                    "reviews": course.get('num_reviews', 10000),
                    "skill": query,
                    "type": "online"
                })
    except Exception as e:
        print(f"Udemy API error: {e}", file=sys.stderr)
    
    return courses


def scrape_coursera(query: str, limit: int = 5) -> list[dict]:
    """
    Scrape Coursera search results for courses
    """
    courses = []
    encoded_query = quote_plus(query)
    
    # Coursera search API
    api_url = f"https://www.coursera.org/api/search/v1?query={encoded_query}&limit={limit}&index=prod_all_products_term_optimization"
    
    try:
        response = requests.get(api_url, headers=HEADERS, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            elements = data.get('elements', [])
            
            for item in elements[:limit]:
                # Coursera has different item types
                name = item.get('name', 'Course')
                slug = item.get('slug', '')
                
                # Determine URL based on type
                item_type = item.get('entityType', 'course')
                if item_type == 'SPECIALIZATION':
                    url = f"https://www.coursera.org/specializations/{slug}"
                elif item_type == 'PROFESSIONAL_CERTIFICATE':
                    url = f"https://www.coursera.org/professional-certificates/{slug}"
                else:
                    url = f"https://www.coursera.org/learn/{slug}"
                
                # Coursera uses subscription model mostly
                price = "Subscription"
                is_free = item.get('isPartOfCourseraPlus', False)
                if is_free:
                    price = "Free with Coursera Plus"
                
                # Get partner/instructor
                partners = item.get('partners', [])
                partner_name = partners[0] if partners else "Coursera"
                
                courses.append({
                    "id": f"coursera_{item.get('objectId', random.randint(1000, 99999))}",
                    "title": name,
                    "description": item.get('description', '')[:200] if item.get('description') else f"Learn {query}",
                    "provider": "Coursera",
                    "providerLogo": "https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/favicon-v2-194x194.png",
                    "url": url,
                    "image": item.get('imageUrl') or item.get('photoUrl'),
                    "price": price,
                    "isFree": is_free,
                    "rating": round(item.get('avgRating', 4.5), 1),
                    "reviews": item.get('numReviews', 5000),
                    "skill": query,
                    "partner": partner_name,
                    "type": "online"
                })
                
    except Exception as e:
        print(f"Coursera API error: {e}", file=sys.stderr)
    
    return courses


def get_randomized_fallback(skill: str, limit: int = 5) -> list[dict]:
    """
    Generate randomized fallback courses when scraping fails
    Uses realistic course templates with randomized prices/ratings
    """
    
    course_templates = {
        "Design": [
            ("Complete Web & Mobile Designer: UI/UX, Figma + more", "Master UI/UX design with Figma, create stunning interfaces"),
            ("User Experience Design Essentials", "Learn UX fundamentals and user-centered design"),
            ("Graphic Design Masterclass", "From beginner to advanced graphic design"),
            ("Adobe Creative Suite Complete Course", "Photoshop, Illustrator, InDesign mastery"),
            ("Modern Web Design with Figma", "Build beautiful responsive designs"),
            ("UI Design Bootcamp", "Create professional user interfaces"),
            ("Design Systems & Components", "Build scalable design systems"),
        ],
        "Prototyping": [
            ("Figma UI UX Design Essentials", "Master Figma for modern design"),
            ("Adobe XD - UI/UX Design", "Complete guide to Adobe XD prototyping"),
            ("Wireframing & Prototyping Fundamentals", "From wireframes to high-fidelity prototypes"),
            ("Interactive Prototyping with Figma", "Create clickable prototypes"),
            ("Rapid Prototyping for Designers", "Speed up your design workflow"),
        ],
        "Programming": [
            ("Complete Python Developer", "Zero to hero Python programming"),
            ("The Complete JavaScript Course", "Modern JavaScript from scratch"),
            ("Full Stack Web Development", "HTML, CSS, JavaScript, React, Node"),
            ("React - The Complete Guide", "Build powerful React applications"),
            ("Python for Data Science", "Learn Python for analytics and ML"),
            ("Node.js - The Complete Guide", "Build REST APIs with Node"),
        ],
        "Tools": [
            ("Git & GitHub Complete Guide", "Version control mastery"),
            ("Docker & Kubernetes Complete Guide", "Container orchestration"),
            ("AWS Certified Solutions Architect", "Cloud architecture fundamentals"),
            ("Linux Command Line Bootcamp", "Master the terminal"),
            ("DevOps Engineering Course", "CI/CD and automation"),
        ],
        "Research": [
            ("User Research & Usability Testing", "Learn research methodologies"),
            ("Data Analysis with Python", "Analyze data effectively"),
            ("Google Analytics Certification", "Master web analytics"),
            ("Market Research Fundamentals", "Understand your users"),
            ("A/B Testing Masterclass", "Data-driven decisions"),
        ],
        "Communication": [
            ("Public Speaking Mastery", "Speak with confidence"),
            ("Technical Writing Course", "Write clear documentation"),
            ("Business Communication Skills", "Professional communication"),
            ("Presentation Design & Delivery", "Create impactful presentations"),
            ("English for Business", "Professional English skills"),
        ],
        "Data Analysis": [
            ("Data Analysis with Python & Pandas", "Master data manipulation"),
            ("SQL for Data Science", "Database querying essentials"),
            ("Tableau Desktop Specialist", "Data visualization mastery"),
            ("Excel for Business Analytics", "Advanced Excel techniques"),
            ("Machine Learning A-Z", "ML algorithms and applications"),
        ],
        "Leadership": [
            ("Project Management Professional (PMP)", "PM certification prep"),
            ("Agile & Scrum Masterclass", "Agile methodology mastery"),
            ("Leadership & Management Skills", "Develop leadership abilities"),
            ("Team Building & Collaboration", "Build high-performing teams"),
            ("Strategic Planning Course", "Business strategy fundamentals"),
        ],
    }
    
    templates = course_templates.get(skill, course_templates["Programming"])
    random.shuffle(templates)
    
    courses = []
    for i, (title, desc) in enumerate(templates[:limit]):
        # Randomize price between common Udemy price points (in PHP)
        price_options = [449, 549, 649, 749, 899, 999, 1299, 1499]
        price = random.choice(price_options)
        
        # Occasionally make it free or discounted
        is_free = random.random() < 0.1
        if is_free:
            price_str = "Free"
        else:
            price_str = f"₱{price}"
        
        # Randomize rating between 4.2 and 4.9
        rating = round(random.uniform(4.2, 4.9), 1)
        
        # Randomize review count
        reviews = random.randint(5000, 80000)
        
        # Alternate between Udemy and Coursera
        provider = "Udemy" if i % 2 == 0 else "Coursera"
        
        courses.append({
            "id": f"{provider.lower()}_{random.randint(10000, 99999)}",
            "title": title,
            "description": desc,
            "provider": provider,
            "providerLogo": "https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg" if provider == "Udemy" else "https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/favicon-v2-194x194.png",
            "url": f"https://www.udemy.com/courses/search/?q={quote_plus(skill)}" if provider == "Udemy" else f"https://www.coursera.org/search?query={quote_plus(skill)}",
            "image": None,
            "price": price_str,
            "isFree": is_free,
            "rating": rating,
            "reviews": reviews,
            "skill": skill,
            "type": "online"
        })
    
    return courses


def search_courses(query: str, limit: int = 5, provider: str = "all") -> list[dict]:
    """
    Search for courses from specified providers
    
    Args:
        query: Search query
        limit: Max courses per provider
        provider: "udemy", "coursera", or "all"
    
    Returns:
        List of course dictionaries
    """
    courses = []
    
    if provider in ["udemy", "all"]:
        udemy_courses = scrape_udemy(query, limit)
        courses.extend(udemy_courses)
        time.sleep(1)  # Rate limiting
    
    if provider in ["coursera", "all"]:
        coursera_courses = scrape_coursera(query, limit)
        courses.extend(coursera_courses)
    
    # If we got nothing, use randomized fallback
    if not courses:
        print(f"Scraping failed, using fallback for: {query}", file=sys.stderr)
        # Find the skill category this query belongs to
        skill_category = "Programming"  # Default
        for category, queries in SKILL_SEARCH_QUERIES.items():
            if query.lower() in [q.lower() for q in queries] or category.lower() in query.lower():
                skill_category = category
                break
        courses = get_randomized_fallback(skill_category, limit)
    
    return courses[:limit * 2] if provider == "all" else courses[:limit]


def batch_scrape_all_skills(limit: int = 5) -> dict:
    """
    Scrape courses for all skill categories and cache results
    
    Returns:
        Dictionary of skill -> courses
    """
    CACHE_DIR.mkdir(exist_ok=True)
    
    all_results = {}
    
    for skill, queries in SKILL_SEARCH_QUERIES.items():
        print(f"Scraping courses for: {skill}", file=sys.stderr)
        
        skill_courses = []
        
        # Use first query for this skill
        primary_query = queries[0]
        courses = search_courses(primary_query, limit, "all")
        
        # Update skill field to category name
        for course in courses:
            course['skill'] = skill
        
        skill_courses.extend(courses)
        
        # Remove duplicates by title
        seen_titles = set()
        unique_courses = []
        for course in skill_courses:
            if course['title'] not in seen_titles:
                seen_titles.add(course['title'])
                unique_courses.append(course)
        
        all_results[skill] = unique_courses[:limit]
        
        # Save to cache file
        cache_file = CACHE_DIR / f"{skill.lower().replace(' ', '_')}.json"
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(unique_courses[:limit], f, indent=2, ensure_ascii=False)
        
        print(f"  -> Found {len(unique_courses[:limit])} courses", file=sys.stderr)
        
        # Rate limiting between skills
        time.sleep(2)
    
    # Save combined results
    combined_file = CACHE_DIR / "all_courses.json"
    with open(combined_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    return all_results


def load_cached_courses(skill: str) -> Optional[list[dict]]:
    """Load courses from cache file for a skill"""
    cache_file = CACHE_DIR / f"{skill.lower().replace(' ', '_')}.json"
    
    if cache_file.exists():
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    
    return None


def main():
    parser = argparse.ArgumentParser(description="Scrape courses from Udemy and Coursera")
    parser.add_argument("query", nargs="?", help="Search query (e.g., 'UI UX design')")
    parser.add_argument("--limit", type=int, default=5, help="Max courses to return (default: 5)")
    parser.add_argument("--provider", choices=["udemy", "coursera", "all"], default="all",
                        help="Provider to scrape (default: all)")
    parser.add_argument("--batch", action="store_true", 
                        help="Batch scrape all skill categories and cache results")
    parser.add_argument("--from-cache", action="store_true",
                        help="Load from cache instead of scraping")
    parser.add_argument("--skill", help="Skill category for cache lookup (e.g., 'Design')")
    
    args = parser.parse_args()
    
    if args.batch:
        # Batch mode: scrape all skills
        results = batch_scrape_all_skills(args.limit)
        print(json.dumps(results, indent=2, ensure_ascii=False))
    elif args.from_cache and args.skill:
        # Load from cache
        cached = load_cached_courses(args.skill)
        if cached:
            print(json.dumps(cached, indent=2, ensure_ascii=False))
        else:
            # Fallback to randomized
            fallback = get_randomized_fallback(args.skill, args.limit)
            print(json.dumps(fallback, indent=2, ensure_ascii=False))
    elif args.query:
        # Single query mode
        courses = search_courses(args.query, args.limit, args.provider)
        print(json.dumps(courses, indent=2, ensure_ascii=False))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
