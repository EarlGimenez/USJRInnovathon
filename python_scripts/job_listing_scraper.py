"""
Job Scraper - Fetches job listings from multiple free/open APIs

Sources (no API key required):
- Remotive (remote jobs)
- RemoteOK (remote tech jobs)
- Arbeitnow (European jobs)
- Jobicy (remote jobs)

Sources (free API key required - for location-based search):
- Adzuna (international, location support) - Get key at: https://developer.adzuna.com/
- JSearch/RapidAPI (aggregates LinkedIn, Indeed) - Get key at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
"""

import requests
import json
import csv
import os
import re
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, asdict
from urllib.parse import quote

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, will use system env vars


@dataclass
class Job:
    """Standardized job listing structure"""
    title: str
    company: str
    location: str
    url: str
    source: str
    salary: Optional[str] = None
    job_type: Optional[str] = None
    description: Optional[str] = None
    posted_date: Optional[str] = None
    tags: Optional[list] = None


# Common skills/tools to extract from job descriptions
COMMON_SKILLS = [
    # Design tools
    "Photoshop", "Illustrator", "InDesign", "Figma", "Sketch", "Canva", "Adobe XD",
    "After Effects", "Premiere Pro", "Adobe Creative Suite", "CorelDRAW", "Lightroom",
    "Blender", "3ds Max", "Maya", "Cinema 4D", "AutoCAD", "SketchUp",
    # Programming
    "Python", "JavaScript", "Java", "C++", "C#", "PHP", "Ruby", "Go", "Rust", "Swift",
    "TypeScript", "Kotlin", "Scala", "R", "MATLAB", "SQL", "HTML", "CSS", "React",
    "Angular", "Vue", "Node.js", "Django", "Flask", "Spring", ".NET", "Laravel",
    # Data/AI
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy",
    "Tableau", "Power BI", "Excel", "Data Analysis", "Data Science", "AI",
    # Cloud/DevOps
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Jenkins", "Git", "Linux",
    # Soft skills
    "Communication", "Leadership", "Teamwork", "Problem Solving", "Project Management",
    # Design skills
    "UI/UX", "User Interface", "User Experience", "Graphic Design", "Web Design",
    "Motion Graphics", "Video Editing", "Animation", "Typography", "Branding",
    "Layout Design", "Print Design", "Digital Marketing", "Social Media",
]


def extract_skills_from_text(text: str) -> list[str]:
    """Extract common skills mentioned in job description"""
    if not text:
        return []

    text_lower = text.lower()
    found_skills = []

    for skill in COMMON_SKILLS:
        # Check for skill mention (case-insensitive, word boundary)
        skill_lower = skill.lower()
        if skill_lower in text_lower:
            # Verify it's a word boundary match (not part of another word)
            pattern = r'\b' + re.escape(skill_lower) + r'\b'
            if re.search(pattern, text_lower):
                found_skills.append(skill)

    return found_skills


class JobScraper:
    """Scrapes job listings from multiple open APIs"""

    def __init__(self):
        self.jobs: list[Job] = []
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "JobScraper/1.0 (Educational Purpose)"
        })

    def fetch_remotive_jobs(self, category: Optional[str] = None, limit: int = 50) -> list[Job]:
        """
        Fetch remote jobs from Remotive API
        Categories: software-dev, customer-support, design, marketing, sales, etc.
        API Docs: https://remotive.com/api/remote-jobs
        """
        print("Fetching jobs from Remotive...")
        url = "https://remotive.com/api/remote-jobs"
        params = {}
        if category:
            params["category"] = category
        if limit:
            params["limit"] = limit

        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            jobs = []
            for job_data in data.get("jobs", []):
                job = Job(
                    title=job_data.get("title", ""),
                    company=job_data.get("company_name", ""),
                    location=job_data.get("candidate_required_location", "Remote"),
                    url=job_data.get("url", ""),
                    source="Remotive",
                    salary=job_data.get("salary", ""),
                    job_type=job_data.get("job_type", ""),
                    description=job_data.get("description", "")[:500] if job_data.get("description") else None,
                    posted_date=job_data.get("publication_date", ""),
                    tags=job_data.get("tags", [])
                )
                jobs.append(job)

            print(f"  Found {len(jobs)} jobs from Remotive")
            self.jobs.extend(jobs)
            return jobs

        except requests.RequestException as e:
            print(f"  Error fetching from Remotive: {e}")
            return []

    def fetch_remoteok_jobs(self, tag: Optional[str] = None) -> list[Job]:
        """
        Fetch remote tech jobs from RemoteOK API
        API: https://remoteok.com/api
        """
        print("Fetching jobs from RemoteOK...")
        url = "https://remoteok.com/api"
        if tag:
            url = f"https://remoteok.com/api?tag={tag}"

        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()

            jobs = []
            # First item is usually metadata, skip it
            for job_data in data[1:] if len(data) > 1 else []:
                if not isinstance(job_data, dict):
                    continue

                salary = ""
                if job_data.get("salary_min") and job_data.get("salary_max"):
                    salary = f"${job_data['salary_min']:,} - ${job_data['salary_max']:,}"

                job = Job(
                    title=job_data.get("position", ""),
                    company=job_data.get("company", ""),
                    location=job_data.get("location", "Remote"),
                    url=job_data.get("url", ""),
                    source="RemoteOK",
                    salary=salary,
                    job_type="Remote",
                    description=job_data.get("description", "")[:500] if job_data.get("description") else None,
                    posted_date=job_data.get("date", ""),
                    tags=job_data.get("tags", [])
                )
                jobs.append(job)

            print(f"  Found {len(jobs)} jobs from RemoteOK")
            self.jobs.extend(jobs)
            return jobs

        except requests.RequestException as e:
            print(f"  Error fetching from RemoteOK: {e}")
            return []

    def fetch_arbeitnow_jobs(self, page: int = 1) -> list[Job]:
        """
        Fetch jobs from Arbeitnow API (European focus)
        API Docs: https://www.arbeitnow.com/api/job-board-api
        """
        print("Fetching jobs from Arbeitnow...")
        url = f"https://www.arbeitnow.com/api/job-board-api?page={page}"

        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()

            jobs = []
            for job_data in data.get("data", []):
                job = Job(
                    title=job_data.get("title", ""),
                    company=job_data.get("company_name", ""),
                    location=job_data.get("location", ""),
                    url=job_data.get("url", ""),
                    source="Arbeitnow",
                    salary=None,
                    job_type="Remote" if job_data.get("remote") else "On-site",
                    description=job_data.get("description", "")[:500] if job_data.get("description") else None,
                    posted_date=job_data.get("created_at", ""),
                    tags=job_data.get("tags", [])
                )
                jobs.append(job)

            print(f"  Found {len(jobs)} jobs from Arbeitnow")
            self.jobs.extend(jobs)
            return jobs

        except requests.RequestException as e:
            print(f"  Error fetching from Arbeitnow: {e}")
            return []

    def fetch_github_jobs_alternative(self, description: str = "python") -> list[Job]:
        """
        Fetch jobs from Jobs.GitHub.com alternative - using Jobicy API
        API: https://jobicy.com/api/v2/remote-jobs
        """
        print("Fetching jobs from Jobicy...")
        url = "https://jobicy.com/api/v2/remote-jobs"
        params = {
            "count": 50,
            "tag": description
        }

        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            jobs = []
            for job_data in data.get("jobs", []):
                job = Job(
                    title=job_data.get("jobTitle", ""),
                    company=job_data.get("companyName", ""),
                    location=job_data.get("jobGeo", "Remote"),
                    url=job_data.get("url", ""),
                    source="Jobicy",
                    salary=job_data.get("annualSalaryMin", ""),
                    job_type=job_data.get("jobType", ""),
                    description=job_data.get("jobExcerpt", ""),
                    posted_date=job_data.get("pubDate", ""),
                    tags=job_data.get("jobIndustry", []) if isinstance(job_data.get("jobIndustry"), list) else []
                )
                jobs.append(job)

            print(f"  Found {len(jobs)} jobs from Jobicy")
            self.jobs.extend(jobs)
            return jobs

        except requests.RequestException as e:
            print(f"  Error fetching from Jobicy: {e}")
            return []

    def fetch_adzuna_jobs(
        self,
        query: str = "developer",
        location: str = "",
        country: str = "ph",  # ph=Philippines, us=USA, gb=UK, sg=Singapore, etc.
        results_per_page: int = 50
    ) -> list[Job]:
        """
        Fetch jobs from Adzuna API (requires free API key)

        Get your free API key at: https://developer.adzuna.com/
        Set environment variables: ADZUNA_APP_ID and ADZUNA_API_KEY

        Country codes: ph (Philippines), us (USA), gb (UK), au (Australia),
                      sg (Singapore), in (India), etc.
        """
        app_id = os.environ.get("ADZUNA_APP_ID")
        api_key = os.environ.get("ADZUNA_API_KEY")

        if not app_id or not api_key:
            print("Skipping Adzuna - Set ADZUNA_APP_ID and ADZUNA_API_KEY env vars")
            print("  Get free API key at: https://developer.adzuna.com/")
            return []

        print(f"Fetching jobs from Adzuna ({country.upper()})...")
        url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"

        params = {
            "app_id": app_id,
            "app_key": api_key,
            "results_per_page": results_per_page,
            "what": query,
            "content-type": "application/json"
        }

        if location:
            params["where"] = location

        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            jobs = []
            for job_data in data.get("results", []):
                salary = ""
                if job_data.get("salary_min") and job_data.get("salary_max"):
                    salary = f"{job_data['salary_min']:,.0f} - {job_data['salary_max']:,.0f}"
                elif job_data.get("salary_min"):
                    salary = f"From {job_data['salary_min']:,.0f}"

                job = Job(
                    title=job_data.get("title", ""),
                    company=job_data.get("company", {}).get("display_name", ""),
                    location=job_data.get("location", {}).get("display_name", ""),
                    url=job_data.get("redirect_url", ""),
                    source="Adzuna",
                    salary=salary,
                    job_type=job_data.get("contract_type", ""),
                    description=job_data.get("description", "")[:500] if job_data.get("description") else None,
                    posted_date=job_data.get("created", ""),
                    tags=job_data.get("category", {}).get("label", "").split(", ") if job_data.get("category") else []
                )
                jobs.append(job)

            print(f"  Found {len(jobs)} jobs from Adzuna")
            self.jobs.extend(jobs)
            return jobs

        except requests.RequestException as e:
            print(f"  Error fetching from Adzuna: {e}")
            return []

    def fetch_jsearch_jobs(
        self,
        query: str = "python developer",
        location: str = "",
        page: int = 1,
        num_pages: int = 1
    ) -> list[Job]:
        """
        Fetch jobs from JSearch API (RapidAPI) - aggregates LinkedIn, Indeed, etc.

        Get your free API key at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
        Set environment variable: RAPIDAPI_KEY

        Supports full location strings like "Taguig City, Philippines"
        """
        api_key = os.environ.get("RAPIDAPI_KEY")

        if not api_key:
            print("Skipping JSearch - Set RAPIDAPI_KEY env var")
            print("  Get free API key at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch")
            return []

        print(f"Fetching jobs from JSearch (query: '{query}', location: '{location}')...")

        # Combine query and location
        search_query = f"{query} in {location}" if location else query

        url = "https://jsearch.p.rapidapi.com/search"
        headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        }
        params = {
            "query": search_query,
            "page": str(page),
            "num_pages": str(num_pages)
        }

        try:
            response = self.session.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            jobs = []
            for job_data in data.get("data", []):
                salary = ""
                if job_data.get("job_min_salary") and job_data.get("job_max_salary"):
                    currency = job_data.get("job_salary_currency", "")
                    salary = f"{currency}{job_data['job_min_salary']:,.0f} - {currency}{job_data['job_max_salary']:,.0f}"

                # Extract skills from multiple possible fields
                skills = []

                # Direct skills field
                if job_data.get("job_required_skills"):
                    skills.extend(job_data["job_required_skills"])

                # Extract from job_highlights (qualifications, responsibilities)
                highlights = job_data.get("job_highlights", {})
                if highlights:
                    # Qualifications often contain skills
                    qualifications = highlights.get("Qualifications", [])
                    if qualifications and isinstance(qualifications, list):
                        # Extract key skills from qualification bullet points
                        for qual in qualifications[:5]:  # Limit to first 5
                            if isinstance(qual, str) and len(qual) < 100:
                                skills.append(qual)

                # Extract from required education/experience
                if job_data.get("job_required_education"):
                    edu = job_data["job_required_education"]
                    if isinstance(edu, dict) and edu.get("required_education_degree_name"):
                        skills.append(f"Education: {edu['required_education_degree_name']}")

                if job_data.get("job_required_experience"):
                    exp = job_data["job_required_experience"]
                    if isinstance(exp, dict):
                        if exp.get("required_experience_in_months"):
                            months = exp["required_experience_in_months"]
                            years = months // 12
                            if years > 0:
                                skills.append(f"Experience: {years}+ years")

                # If no structured skills found, extract from description
                if not skills:
                    description = job_data.get("job_description", "")
                    skills = extract_skills_from_text(description)

                job = Job(
                    title=job_data.get("job_title", ""),
                    company=job_data.get("employer_name", ""),
                    location=f"{job_data.get('job_city', '')} {job_data.get('job_state', '')} {job_data.get('job_country', '')}".strip(),
                    url=job_data.get("job_apply_link", "") or job_data.get("job_google_link", ""),
                    source="JSearch",
                    salary=salary,
                    job_type=job_data.get("job_employment_type", ""),
                    description=job_data.get("job_description", "")[:500] if job_data.get("job_description") else None,
                    posted_date=job_data.get("job_posted_at_datetime_utc", ""),
                    tags=skills
                )
                jobs.append(job)

            print(f"  Found {len(jobs)} jobs from JSearch")
            self.jobs.extend(jobs)
            return jobs

        except requests.RequestException as e:
            print(f"  Error fetching from JSearch: {e}")
            return []

    def fetch_all_jobs(self, search_term: Optional[str] = None) -> list[Job]:
        """Fetch jobs from all available sources"""
        print(f"\n{'='*60}")
        print("Starting job scraping from all sources...")
        print(f"{'='*60}\n")

        self.jobs = []  # Reset jobs list

        # Fetch from all sources (all free, no auth required)
        self.fetch_remotive_jobs(limit=50)
        self.fetch_remoteok_jobs(tag=search_term)
        self.fetch_arbeitnow_jobs()
        self.fetch_github_jobs_alternative(description=search_term or "developer")

        # These require free API keys (will skip if not configured)
        self.fetch_adzuna_jobs(query=search_term or "developer")
        self.fetch_jsearch_jobs(query=search_term or "developer")

        print(f"\n{'='*60}")
        print(f"Total jobs collected: {len(self.jobs)}")
        print(f"{'='*60}\n")

        return self.jobs

    def fetch_local_jobs(
        self,
        job_title: str,
        location: str,
        country_code: str = "ph"
    ) -> list[Job]:
        """
        Fetch jobs for a specific location (e.g., "Digital designer" in "Taguig City")

        This uses location-aware APIs (Adzuna, JSearch) to find local jobs.

        Args:
            job_title: Job title to search (e.g., "Digital designer", "Python developer")
            location: City/area (e.g., "Taguig City", "Makati", "Manila")
            country_code: Country code for Adzuna (ph=Philippines, sg=Singapore, etc.)
        """
        print(f"\n{'='*60}")
        print(f"Searching for '{job_title}' in '{location}'...")
        print(f"{'='*60}\n")

        self.jobs = []  # Reset

        # JSearch works best for location-specific searches (aggregates LinkedIn, Indeed)
        self.fetch_jsearch_jobs(query=job_title, location=location, num_pages=3)

        # Adzuna with country code
        self.fetch_adzuna_jobs(query=job_title, location=location, country=country_code)

        print(f"\n{'='*60}")
        print(f"Total local jobs found: {len(self.jobs)}")
        print(f"{'='*60}\n")

        return self.jobs

    def filter_jobs(self, keyword: str) -> list[Job]:
        """Filter jobs by keyword in title or description"""
        keyword_lower = keyword.lower()
        return [
            job for job in self.jobs
            if keyword_lower in job.title.lower()
            or (job.description and keyword_lower in job.description.lower())
            or (job.tags and any(keyword_lower in tag.lower() for tag in job.tags))
        ]

    def filter_by_location(self, location: str) -> list[Job]:
        """Filter jobs by location (city, country, etc.)"""
        location_lower = location.lower()
        return [
            job for job in self.jobs
            if location_lower in job.location.lower()
        ]

    def search(self, keyword: Optional[str] = None, location: Optional[str] = None) -> list[Job]:
        """Filter jobs by keyword AND/OR location"""
        results = self.jobs

        if keyword:
            keyword_lower = keyword.lower()
            results = [
                job for job in results
                if keyword_lower in job.title.lower()
                or (job.description and keyword_lower in job.description.lower())
                or (job.tags and any(keyword_lower in tag.lower() for tag in job.tags))
            ]

        if location:
            location_lower = location.lower()
            results = [
                job for job in results
                if location_lower in job.location.lower()
            ]

        return results

    def save_to_json(self, filename: str = "jobs.json", jobs: Optional[list[Job]] = None):
        """Save jobs to JSON file"""
        jobs_to_save = jobs or self.jobs
        with open(filename, "w", encoding="utf-8") as f:
            json.dump([asdict(job) for job in jobs_to_save], f, indent=2, ensure_ascii=False)
        print(f"Saved {len(jobs_to_save)} jobs to {filename}")

    def save_to_csv(self, filename: str = "jobs.csv", jobs: Optional[list[Job]] = None):
        """Save jobs to CSV file"""
        jobs_to_save = jobs or self.jobs
        if not jobs_to_save:
            print("No jobs to save")
            return

        fieldnames = ["title", "company", "location", "url", "source", "salary",
                      "job_type", "description", "posted_date", "tags"]

        with open(filename, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for job in jobs_to_save:
                job_dict = asdict(job)
                job_dict["tags"] = ", ".join(job_dict["tags"]) if job_dict["tags"] else ""
                writer.writerow(job_dict)

        print(f"Saved {len(jobs_to_save)} jobs to {filename}")

    def print_jobs(self, jobs: Optional[list[Job]] = None, limit: int = 10, show_description: bool = True):
        """Print jobs to console"""
        jobs_to_print = (jobs or self.jobs)[:limit]

        for i, job in enumerate(jobs_to_print, 1):
            # Handle Unicode characters that may not display in all terminals
            title = job.title.encode('ascii', 'ignore').decode('ascii')
            company = job.company.encode('ascii', 'ignore').decode('ascii')

            print(f"\n{'-'*60}")
            print(f"#{i} {title}")
            print(f"   Company:  {company}")
            print(f"   Location: {job.location}")
            print(f"   Type:     {job.job_type}")
            print(f"   Source:   {job.source}")
            if job.salary:
                print(f"   Salary:   {job.salary}")

            # Show skills/tags
            if job.tags and len(job.tags) > 0:
                skills = ", ".join(str(tag) for tag in job.tags[:10])  # Limit to 10 tags
                print(f"   Skills:   {skills}")

            # Show description
            if show_description and job.description:
                # Clean up and truncate description for display
                desc = job.description.encode('ascii', 'ignore').decode('ascii')
                desc = ' '.join(desc.split())  # Normalize whitespace
                if len(desc) > 300:
                    desc = desc[:300] + "..."
                print(f"   Description:")
                # Word wrap at ~70 chars
                words = desc.split()
                line = "      "
                for word in words:
                    if len(line) + len(word) + 1 > 70:
                        print(line)
                        line = "      " + word
                    else:
                        line += " " + word if line.strip() else word
                if line.strip():
                    print(line)

            print(f"   URL:      {job.url}")


def main():
    import sys

    # Get command line arguments
    job_title = sys.argv[1] if len(sys.argv) > 1 else "Graphics designer"
    location = sys.argv[2] if len(sys.argv) > 2 else "Taguig City"

    # Create scraper instance
    scraper = JobScraper()

    # Fetch local jobs
    local_jobs = scraper.fetch_local_jobs(
        job_title=job_title,
        location=location,
        country_code="ph"
    )

    # Output JSON to stdout
    if local_jobs:
        print(json.dumps([asdict(job) for job in local_jobs], indent=2, ensure_ascii=True))


if __name__ == "__main__":
    main()
