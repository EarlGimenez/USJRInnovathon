// Mock Job Generator - Creates dynamic job listings with AI-like descriptions
// Used when the CareerJet API is not available or returns broken listings

const COMPANIES = [
    { name: 'Accenture Philippines', type: 'Consulting' },
    { name: 'Globe Telecom', type: 'Telecommunications' },
    { name: 'Maya (PayMaya)', type: 'Fintech' },
    { name: 'Canva Philippines', type: 'Design Technology' },
    { name: 'Kalibrr', type: 'HR Technology' },
    { name: 'Mynt (GCash)', type: 'Fintech' },
    { name: 'Shopee Philippines', type: 'E-commerce' },
    { name: 'Grab Philippines', type: 'Technology' },
    { name: 'Thinking Machines', type: 'Data Science' },
    { name: 'FullScale', type: 'Software Development' },
    { name: 'Sprout Solutions', type: 'HR Technology' },
    { name: 'PDAX', type: 'Cryptocurrency' },
    { name: 'Voyager Innovations', type: 'Digital Payments' },
    { name: 'Zendesk Manila', type: 'Customer Service Tech' },
    { name: 'Symph', type: 'Software Development' }
];

const LOCATIONS = [
    { name: 'BGC, Taguig', lat: 14.5512, lng: 121.0498 },
    { name: 'The Globe Tower, BGC', lat: 14.5547, lng: 121.0462 },
    { name: 'Net One Center, BGC', lat: 14.5489, lng: 121.0505 },
    { name: 'High Street, BGC', lat: 14.5503, lng: 121.0451 },
    { name: 'Uptown BGC, Taguig', lat: 14.5565, lng: 121.0532 },
    { name: 'SM Aura, BGC', lat: 14.5449, lng: 121.0546 },
    { name: 'One Bonifacio High Street', lat: 14.5508, lng: 121.0480 },
    { name: 'World Plaza, BGC', lat: 14.5520, lng: 121.0515 },
    { name: 'Three Two Five McKinley', lat: 14.5495, lng: 121.0460 },
    { name: 'Alveo Park Triangle', lat: 14.5540, lng: 121.0505 }
];

const JOB_TEMPLATES = {
    Design: [
        { title: 'UX Designer', salaryMin: 45000, salaryMax: 75000 },
        { title: 'UI Designer', salaryMin: 40000, salaryMax: 65000 },
        { title: 'Product Designer', salaryMin: 55000, salaryMax: 90000 },
        { title: 'Visual Designer', salaryMin: 35000, salaryMax: 55000 },
        { title: 'Senior UX Designer', salaryMin: 70000, salaryMax: 120000 },
        { title: 'Design Lead', salaryMin: 80000, salaryMax: 130000 }
    ],
    Tools: [
        { title: 'Frontend Developer', salaryMin: 50000, salaryMax: 90000 },
        { title: 'Full Stack Developer', salaryMin: 60000, salaryMax: 110000 },
        { title: 'Software Engineer', salaryMin: 55000, salaryMax: 100000 },
        { title: 'Junior Developer', salaryMin: 30000, salaryMax: 50000 },
        { title: 'Senior Software Engineer', salaryMin: 90000, salaryMax: 150000 },
        { title: 'DevOps Engineer', salaryMin: 70000, salaryMax: 120000 }
    ],
    Communication: [
        { title: 'Product Manager', salaryMin: 70000, salaryMax: 130000 },
        { title: 'Project Manager', salaryMin: 55000, salaryMax: 90000 },
        { title: 'Scrum Master', salaryMin: 60000, salaryMax: 100000 },
        { title: 'Business Analyst', salaryMin: 50000, salaryMax: 85000 },
        { title: 'Technical Writer', salaryMin: 40000, salaryMax: 70000 }
    ],
    Research: [
        { title: 'UX Researcher', salaryMin: 50000, salaryMax: 85000 },
        { title: 'Data Analyst', salaryMin: 45000, salaryMax: 80000 },
        { title: 'Data Scientist', salaryMin: 70000, salaryMax: 130000 },
        { title: 'Market Research Analyst', salaryMin: 40000, salaryMax: 70000 },
        { title: 'Research Lead', salaryMin: 80000, salaryMax: 120000 }
    ],
    Prototyping: [
        { title: 'Interaction Designer', salaryMin: 50000, salaryMax: 85000 },
        { title: 'Motion Designer', salaryMin: 45000, salaryMax: 75000 },
        { title: 'Prototype Developer', salaryMin: 55000, salaryMax: 90000 },
        { title: 'Creative Technologist', salaryMin: 60000, salaryMax: 100000 }
    ]
};

const DESCRIPTION_TEMPLATES = [
    {
        intro: "We are looking for a talented {title} to join our growing team at {company}.",
        body: "In this role, you will work closely with cross-functional teams to deliver exceptional user experiences and drive product innovation.",
        requirements: "The ideal candidate has strong problem-solving skills and a passion for creating impactful solutions."
    },
    {
        intro: "{company} is seeking an experienced {title} to help shape the future of our digital products.",
        body: "You'll be responsible for leading design initiatives, collaborating with stakeholders, and mentoring junior team members.",
        requirements: "We're looking for someone who thrives in a fast-paced environment and has a keen eye for detail."
    },
    {
        intro: "Join {company} as a {title} and be part of an innovative team transforming the {industry} industry.",
        body: "This position offers the opportunity to work on cutting-edge projects that impact millions of users across Southeast Asia.",
        requirements: "Strong communication skills and the ability to work independently are essential for this role."
    },
    {
        intro: "Are you a creative {title} looking for your next challenge? {company} wants you!",
        body: "We offer a collaborative work environment, competitive benefits, and opportunities for professional growth.",
        requirements: "Candidates should demonstrate a portfolio of relevant work and a track record of successful project delivery."
    },
    {
        intro: "{company} is expanding our team and looking for a {title} to drive our product vision forward.",
        body: "You'll have the autonomy to make impactful decisions and work with the latest technologies and methodologies.",
        requirements: "Experience with agile methodologies and a user-centered design approach is highly valued."
    }
];

const BENEFITS = [
    "Competitive salary and performance bonuses",
    "Health insurance coverage (HMO)",
    "Flexible work arrangements / Hybrid setup",
    "Professional development allowance",
    "Annual leave and sick leave benefits",
    "Stock options / equity",
    "Free meals and snacks",
    "Gym membership subsidy",
    "Mental health support program",
    "Team building activities"
];

// Generate a random selection from an array
function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Generate required skills based on job category
function generateRequiredSkills(primarySkill, userSkills = {}) {
    const skills = {
        Design: 30 + Math.floor(Math.random() * 40),
        Prototyping: 30 + Math.floor(Math.random() * 40),
        Tools: 30 + Math.floor(Math.random() * 40),
        Research: 30 + Math.floor(Math.random() * 40),
        Communication: 30 + Math.floor(Math.random() * 40)
    };
    
    // Boost primary skill requirement
    skills[primarySkill] = 60 + Math.floor(Math.random() * 35);
    
    // Adjust based on user skills to create better matches
    if (userSkills) {
        Object.keys(skills).forEach(skill => {
            if (userSkills[skill] > 70) {
                // If user is good at this, make some jobs require it more
                if (Math.random() > 0.5) {
                    skills[skill] = Math.max(skills[skill], userSkills[skill] - 15);
                }
            }
        });
    }
    
    return skills;
}

// Generate a unique job description
function generateDescription(title, company, industry) {
    const template = randomFrom(DESCRIPTION_TEMPLATES);
    const benefits = [];
    const usedIndices = new Set();
    
    while (benefits.length < 4) {
        const idx = Math.floor(Math.random() * BENEFITS.length);
        if (!usedIndices.has(idx)) {
            usedIndices.add(idx);
            benefits.push(BENEFITS[idx]);
        }
    }
    
    const intro = template.intro
        .replace('{title}', title)
        .replace('{company}', company)
        .replace('{industry}', industry);
    
    const body = template.body;
    const requirements = template.requirements;
    
    return `${intro}\n\n${body}\n\n${requirements}\n\nBenefits:\n${benefits.map(b => `• ${b}`).join('\n')}`;
}

// Main function to generate mock jobs
export function generateMockJobs(userSkills = {}, count = 5) {
    const jobs = [];
    const usedCompanies = new Set();
    const usedLocations = new Set();
    
    // Determine primary skill category based on user skills
    const sortedSkills = Object.entries(userSkills)
        .sort((a, b) => b[1] - a[1]);
    
    const primaryCategories = sortedSkills.slice(0, 3).map(([skill]) => skill);
    
    for (let i = 0; i < count; i++) {
        // Pick a category - prioritize user's strong skills but include variety
        const category = i < 2 
            ? primaryCategories[i % primaryCategories.length]
            : randomFrom(Object.keys(JOB_TEMPLATES));
        
        // Pick a job template from this category
        const jobTemplate = randomFrom(JOB_TEMPLATES[category]);
        
        // Pick a company (avoid duplicates)
        let company;
        let attempts = 0;
        do {
            company = randomFrom(COMPANIES);
            attempts++;
        } while (usedCompanies.has(company.name) && attempts < 10);
        usedCompanies.add(company.name);
        
        // Pick a location (avoid duplicates when possible)
        let location;
        attempts = 0;
        do {
            location = randomFrom(LOCATIONS);
            attempts++;
        } while (usedLocations.has(location.name) && attempts < 10);
        usedLocations.add(location.name);
        
        // Slight random offset to location coordinates
        const latOffset = (Math.random() - 0.5) * 0.005;
        const lngOffset = (Math.random() - 0.5) * 0.005;
        
        const job = {
            id: `mock_${Date.now()}_${i}`,
            title: jobTemplate.title,
            company: company.name,
            location: location.name,
            latitude: location.lat + latOffset,
            longitude: location.lng + lngOffset,
            salary: `₱${jobTemplate.salaryMin.toLocaleString()} - ₱${jobTemplate.salaryMax.toLocaleString()}`,
            type: Math.random() > 0.2 ? 'Full-time' : 'Contract',
            description: generateDescription(jobTemplate.title, company.name, company.type),
            requiredSkills: generateRequiredSkills(category, userSkills),
            postedDate: getRandomPostedDate(),
            applicationDeadline: getApplicationDeadline(),
            isRemote: Math.random() > 0.7,
            isMockData: true
        };
        
        jobs.push(job);
    }
    
    return jobs;
}

function getRandomPostedDate() {
    const daysAgo = Math.floor(Math.random() * 14) + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getApplicationDeadline() {
    const daysFromNow = Math.floor(Math.random() * 21) + 7;
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default { generateMockJobs };
