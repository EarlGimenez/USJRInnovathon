import React, { useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    FileText,
    Ticket,
    TrendingUp,
    Award,
    Users,
    BookOpen,
    ArrowUp,
    ArrowDown,
    Crown,
    Medal,
    Trophy,
    Sparkles,
    BarChart3,
    PieChart,
    Activity,
    Briefcase,
    X,
    Calendar,
    CheckCircle2,
    Clock,
    XCircle,
    FolderOpen,
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
);

// Mock Data
const MOCK_COURSES = [
    { id: 1, name: 'Web Development', petitions: 156, vouchers: 89, trend: 12 },
    { id: 2, name: 'Data Science', petitions: 142, vouchers: 78, trend: 8 },
    { id: 3, name: 'UI/UX Design', petitions: 128, vouchers: 95, trend: 15 },
    { id: 4, name: 'Digital Marketing', petitions: 98, vouchers: 62, trend: -3 },
    { id: 5, name: 'Cloud Computing', petitions: 87, vouchers: 54, trend: 5 },
    { id: 6, name: 'Cybersecurity', petitions: 76, vouchers: 48, trend: 22 },
    { id: 7, name: 'Mobile Development', petitions: 72, vouchers: 41, trend: -1 },
    { id: 8, name: 'Machine Learning', petitions: 65, vouchers: 38, trend: 18 },
    { id: 9, name: 'Project Management', petitions: 54, vouchers: 32, trend: 2 },
    { id: 10, name: 'Business Analytics', petitions: 48, vouchers: 28, trend: 7 },
];

const MONTHLY_DATA = {
    labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
    petitions: [420, 485, 512, 590, 645, 726],
    vouchers: [280, 310, 345, 390, 425, 465],
};

// Job types/titles for the analytics
const JOB_TYPES = [
    'Software Engineer',
    'Data Analyst',
    'UI/UX Designer',
    'Project Manager',
    'DevOps Engineer',
    'Marketing Specialist',
    'Full Stack Developer',
    'Mobile Developer',
    'Cloud Architect',
    'Cybersecurity Analyst',
    'Business Analyst',
    'Product Manager',
    'Machine Learning Engineer',
    'Frontend Developer',
    'Backend Developer',
];

// Detailed Job Posting Analytics Mock Data with individual jobs
const JOB_POSTING_DATA = [
    {
        month: 'August',
        year: 2025,
        jobs: [
            { id: 1, title: 'Software Engineer', company: 'Tech Corp', status: 'filled', applicants: 45 },
            { id: 2, title: 'Data Analyst', company: 'Data Inc', status: 'filled', applicants: 32 },
            { id: 3, title: 'UI/UX Designer', company: 'Design Studio', status: 'open', applicants: 28 },
            { id: 4, title: 'Project Manager', company: 'PM Solutions', status: 'expired', applicants: 15 },
            { id: 5, title: 'DevOps Engineer', company: 'Cloud Systems', status: 'filled', applicants: 38 },
            { id: 6, title: 'Marketing Specialist', company: 'Brand Co', status: 'open', applicants: 22 },
            { id: 7, title: 'Full Stack Developer', company: 'Web Agency', status: 'filled', applicants: 52 },
            { id: 8, title: 'Mobile Developer', company: 'App Studio', status: 'expired', applicants: 18 },
            { id: 9, title: 'Software Engineer', company: 'Startup XYZ', status: 'open', applicants: 41 },
            { id: 10, title: 'Data Analyst', company: 'Analytics Pro', status: 'filled', applicants: 29 },
            { id: 11, title: 'Cloud Architect', company: 'Cloud Nine', status: 'open', applicants: 35 },
            { id: 12, title: 'Cybersecurity Analyst', company: 'SecureIT', status: 'filled', applicants: 24 },
        ],
    },
    {
        month: 'September',
        year: 2025,
        jobs: [
            { id: 13, title: 'Software Engineer', company: 'Innovation Labs', status: 'filled', applicants: 58 },
            { id: 14, title: 'Full Stack Developer', company: 'Digital First', status: 'filled', applicants: 47 },
            { id: 15, title: 'Data Analyst', company: 'Insight Corp', status: 'open', applicants: 33 },
            { id: 16, title: 'UI/UX Designer', company: 'Creative Hub', status: 'filled', applicants: 41 },
            { id: 17, title: 'Machine Learning Engineer', company: 'AI Solutions', status: 'open', applicants: 29 },
            { id: 18, title: 'Backend Developer', company: 'Server Pro', status: 'expired', applicants: 21 },
            { id: 19, title: 'Product Manager', company: 'Product Co', status: 'filled', applicants: 36 },
            { id: 20, title: 'DevOps Engineer', company: 'Deploy Fast', status: 'filled', applicants: 44 },
            { id: 21, title: 'Frontend Developer', company: 'UI Masters', status: 'open', applicants: 38 },
            { id: 22, title: 'Software Engineer', company: 'Code Factory', status: 'filled', applicants: 62 },
            { id: 23, title: 'Business Analyst', company: 'Consult Inc', status: 'expired', applicants: 19 },
            { id: 24, title: 'Mobile Developer', company: 'Mobile First', status: 'open', applicants: 31 },
        ],
    },
    {
        month: 'October',
        year: 2025,
        jobs: [
            { id: 25, title: 'Software Engineer', company: 'Tech Giants', status: 'filled', applicants: 71 },
            { id: 26, title: 'Software Engineer', company: 'Startup ABC', status: 'filled', applicants: 54 },
            { id: 27, title: 'Data Analyst', company: 'Big Data Co', status: 'filled', applicants: 42 },
            { id: 28, title: 'Full Stack Developer', company: 'Web Works', status: 'open', applicants: 48 },
            { id: 29, title: 'UI/UX Designer', company: 'Design Pro', status: 'filled', applicants: 37 },
            { id: 30, title: 'Cloud Architect', company: 'Sky Systems', status: 'open', applicants: 29 },
            { id: 31, title: 'DevOps Engineer', company: 'CI/CD Labs', status: 'filled', applicants: 51 },
            { id: 32, title: 'Machine Learning Engineer', company: 'ML Corp', status: 'expired', applicants: 23 },
            { id: 33, title: 'Cybersecurity Analyst', company: 'CyberShield', status: 'filled', applicants: 34 },
            { id: 34, title: 'Project Manager', company: 'Agile Teams', status: 'open', applicants: 27 },
            { id: 35, title: 'Backend Developer', company: 'API Masters', status: 'expired', applicants: 18 },
            { id: 36, title: 'Frontend Developer', company: 'React Studio', status: 'filled', applicants: 45 },
        ],
    },
    {
        month: 'November',
        year: 2025,
        jobs: [
            { id: 37, title: 'Software Engineer', company: 'Enterprise Tech', status: 'filled', applicants: 68 },
            { id: 38, title: 'Software Engineer', company: 'Fintech Co', status: 'filled', applicants: 59 },
            { id: 39, title: 'Full Stack Developer', company: 'Stack Overflow', status: 'filled', applicants: 55 },
            { id: 40, title: 'Data Analyst', company: 'Data Driven', status: 'open', applicants: 39 },
            { id: 41, title: 'UI/UX Designer', company: 'Pixel Perfect', status: 'filled', applicants: 43 },
            { id: 42, title: 'DevOps Engineer', company: 'Kubernetes Pro', status: 'filled', applicants: 47 },
            { id: 43, title: 'Product Manager', company: 'Product Labs', status: 'open', applicants: 32 },
            { id: 44, title: 'Mobile Developer', company: 'Swift Studio', status: 'filled', applicants: 41 },
            { id: 45, title: 'Cloud Architect', company: 'AWS Partners', status: 'expired', applicants: 26 },
            { id: 46, title: 'Machine Learning Engineer', company: 'Deep Learning Inc', status: 'filled', applicants: 38 },
            { id: 47, title: 'Business Analyst', company: 'Strategy Co', status: 'open', applicants: 28 },
            { id: 48, title: 'Cybersecurity Analyst', company: 'Firewall Pro', status: 'expired', applicants: 21 },
        ],
    },
    {
        month: 'December',
        year: 2025,
        jobs: [
            { id: 49, title: 'Software Engineer', company: 'Year End Tech', status: 'filled', applicants: 52 },
            { id: 50, title: 'Full Stack Developer', company: 'Holiday Apps', status: 'filled', applicants: 44 },
            { id: 51, title: 'Data Analyst', company: 'EOY Analytics', status: 'expired', applicants: 31 },
            { id: 52, title: 'UI/UX Designer', company: 'Winter Design', status: 'filled', applicants: 38 },
            { id: 53, title: 'DevOps Engineer', company: 'Deploy Now', status: 'open', applicants: 35 },
            { id: 54, title: 'Backend Developer', company: 'Server Side', status: 'expired', applicants: 22 },
            { id: 55, title: 'Frontend Developer', company: 'Client Side', status: 'filled', applicants: 41 },
            { id: 56, title: 'Project Manager', company: 'Q4 Projects', status: 'filled', applicants: 29 },
            { id: 57, title: 'Mobile Developer', company: 'Android Plus', status: 'open', applicants: 33 },
            { id: 58, title: 'Software Engineer', company: 'Winter Code', status: 'expired', applicants: 27 },
            { id: 59, title: 'Cloud Architect', company: 'Multi Cloud', status: 'filled', applicants: 36 },
            { id: 60, title: 'Marketing Specialist', company: 'Holiday Marketing', status: 'open', applicants: 24 },
        ],
    },
    {
        month: 'January',
        year: 2026,
        jobs: [
            { id: 61, title: 'Software Engineer', company: 'New Year Tech', status: 'filled', applicants: 78 },
            { id: 62, title: 'Software Engineer', company: 'Fresh Start Inc', status: 'filled', applicants: 65 },
            { id: 63, title: 'Software Engineer', company: '2026 Labs', status: 'open', applicants: 54 },
            { id: 64, title: 'Full Stack Developer', company: 'Resolution Apps', status: 'filled', applicants: 58 },
            { id: 65, title: 'Data Analyst', company: 'New Insights', status: 'filled', applicants: 47 },
            { id: 66, title: 'UI/UX Designer', company: 'Fresh Design Co', status: 'open', applicants: 42 },
            { id: 67, title: 'DevOps Engineer', company: 'Pipeline Pro', status: 'filled', applicants: 51 },
            { id: 68, title: 'Machine Learning Engineer', company: 'AI 2026', status: 'open', applicants: 39 },
            { id: 69, title: 'Product Manager', company: 'Roadmap Inc', status: 'filled', applicants: 33 },
            { id: 70, title: 'Cybersecurity Analyst', company: 'Secure Start', status: 'expired', applicants: 28 },
            { id: 71, title: 'Cloud Architect', company: 'Cloud First', status: 'filled', applicants: 44 },
            { id: 72, title: 'Mobile Developer', company: 'iOS Masters', status: 'open', applicants: 36 },
            { id: 73, title: 'Frontend Developer', company: 'Vue Studio', status: 'filled', applicants: 49 },
            { id: 74, title: 'Backend Developer', company: 'Node Factory', status: 'open', applicants: 31 },
            { id: 75, title: 'Business Analyst', company: 'Growth Co', status: 'expired', applicants: 22 },
        ],
    },
];

// Process job data to calculate totals per month
const JOB_POSTING_WITH_OPEN = JOB_POSTING_DATA.map(monthData => {
    const filled = monthData.jobs.filter(j => j.status === 'filled').length;
    const expired = monthData.jobs.filter(j => j.status === 'expired').length;
    const open = monthData.jobs.filter(j => j.status === 'open').length;
    return {
        month: monthData.month,
        year: monthData.year,
        jobs: monthData.jobs,
        total: monthData.jobs.length,
        filled,
        expired,
        open,
    };
});

// Calculate job demand across all months
const calculateJobDemand = () => {
    const demandMap = {};
    JOB_POSTING_DATA.forEach(monthData => {
        monthData.jobs.forEach(job => {
            if (!demandMap[job.title]) {
                demandMap[job.title] = { title: job.title, filled: 0, open: 0, expired: 0, totalApplicants: 0, count: 0 };
            }
            demandMap[job.title].count++;
            demandMap[job.title].totalApplicants += job.applicants;
            demandMap[job.title][job.status]++;
        });
    });
    return Object.values(demandMap).sort((a, b) => b.count - a.count);
};

const JOB_DEMAND_DATA = calculateJobDemand();

// User applications trend data
const USER_APPLICATIONS_DATA = {
    labels: JOB_POSTING_DATA.map(d => d.month.substring(0, 3)),
    applications: JOB_POSTING_DATA.map(d => d.jobs.reduce((sum, j) => sum + j.applicants, 0)),
    openPositions: JOB_POSTING_WITH_OPEN.map(d => d.open),
};

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedMonth, setSelectedMonth] = useState(null);

    // Calculate totals
    const totalPetitions = MOCK_COURSES.reduce((sum, course) => sum + course.petitions, 0);
    const totalVouchers = MOCK_COURSES.reduce((sum, course) => sum + course.vouchers, 0);
    const topPetitionCourse = [...MOCK_COURSES].sort((a, b) => b.petitions - a.petitions)[0];
    const topVoucherCourse = [...MOCK_COURSES].sort((a, b) => b.vouchers - a.vouchers)[0];

    // Chart configurations
    const petitionsChartData = {
        labels: MOCK_COURSES.map(c => c.name),
        datasets: [
            {
                label: 'Petitions',
                data: MOCK_COURSES.map(c => c.petitions),
                backgroundColor: MOCK_COURSES.map((c, i) =>
                    c.id === topPetitionCourse.id
                        ? 'rgba(17, 65, 36, 0.9)'
                        : `rgba(17, 65, 36, ${0.3 + (0.5 * (MOCK_COURSES.length - i) / MOCK_COURSES.length)})`
                ),
                borderColor: MOCK_COURSES.map(c =>
                    c.id === topPetitionCourse.id ? '#114124' : 'rgba(17, 65, 36, 0.6)'
                ),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            },
        ],
    };

    const vouchersChartData = {
        labels: MOCK_COURSES.map(c => c.name),
        datasets: [
            {
                label: 'Voucher Requests',
                data: MOCK_COURSES.map(c => c.vouchers),
                backgroundColor: MOCK_COURSES.map((c, i) =>
                    c.id === topVoucherCourse.id
                        ? 'rgba(59, 130, 246, 0.9)'
                        : `rgba(59, 130, 246, ${0.3 + (0.5 * (MOCK_COURSES.length - i) / MOCK_COURSES.length)})`
                ),
                borderColor: MOCK_COURSES.map(c =>
                    c.id === topVoucherCourse.id ? '#3b82f6' : 'rgba(59, 130, 246, 0.6)'
                ),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            },
        ],
    };

    const combinedChartData = {
        labels: MOCK_COURSES.slice(0, 6).map(c => c.name),
        datasets: [
            {
                label: 'Petitions',
                data: MOCK_COURSES.slice(0, 6).map(c => c.petitions),
                backgroundColor: 'rgba(17, 65, 36, 0.8)',
                borderColor: '#114124',
                borderWidth: 2,
                borderRadius: 6,
            },
            {
                label: 'Voucher Requests',
                data: MOCK_COURSES.slice(0, 6).map(c => c.vouchers),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                borderRadius: 6,
            },
        ],
    };

    // Separate trend charts for petitions and vouchers
    const petitionTrendData = {
        labels: MONTHLY_DATA.labels,
        datasets: [
            {
                label: 'Petition Requests',
                data: MONTHLY_DATA.petitions,
                borderColor: '#114124',
                backgroundColor: 'rgba(17, 65, 36, 0.15)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#114124',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
            },
        ],
    };

    const voucherTrendData = {
        labels: MONTHLY_DATA.labels,
        datasets: [
            {
                label: 'Voucher Requests',
                data: MONTHLY_DATA.vouchers,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
            },
        ],
    };

    const petitionsDoughnutData = {
        labels: MOCK_COURSES.slice(0, 5).map(c => c.name),
        datasets: [
            {
                data: MOCK_COURSES.slice(0, 5).map(c => c.petitions),
                backgroundColor: [
                    'rgba(17, 65, 36, 0.9)',
                    'rgba(17, 65, 36, 0.7)',
                    'rgba(17, 65, 36, 0.5)',
                    'rgba(17, 65, 36, 0.35)',
                    'rgba(17, 65, 36, 0.2)',
                ],
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 10,
            },
        ],
    };

    const vouchersDoughnutData = {
        labels: MOCK_COURSES.slice(0, 5).map(c => c.name),
        datasets: [
            {
                data: MOCK_COURSES.slice(0, 5).map(c => c.vouchers),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.9)',
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(59, 130, 246, 0.5)',
                    'rgba(59, 130, 246, 0.35)',
                    'rgba(59, 130, 246, 0.2)',
                ],
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 10,
            },
        ],
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: { family: "'Instrument Sans', sans-serif", size: 14 },
                bodyFont: { family: "'Instrument Sans', sans-serif", size: 13 },
                padding: 12,
                cornerRadius: 8,
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { font: { family: "'Instrument Sans', sans-serif" } },
            },
            y: {
                grid: { display: false },
                ticks: {
                    font: { family: "'Instrument Sans', sans-serif", size: 11 },
                    color: '#374151',
                },
            },
        },
    };

    const combinedBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { font: { family: "'Instrument Sans', sans-serif" }, padding: 20 },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: { family: "'Instrument Sans', sans-serif", size: 14 },
                bodyFont: { family: "'Instrument Sans', sans-serif", size: 13 },
                padding: 12,
                cornerRadius: 8,
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    font: { family: "'Instrument Sans', sans-serif", size: 10 },
                    maxRotation: 45,
                },
            },
            y: {
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { font: { family: "'Instrument Sans', sans-serif" } },
            },
        },
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { font: { family: "'Instrument Sans', sans-serif" }, padding: 20 },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: { family: "'Instrument Sans', sans-serif", size: 14 },
                bodyFont: { family: "'Instrument Sans', sans-serif", size: 13 },
                padding: 12,
                cornerRadius: 8,
                mode: 'index',
                intersect: false,
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { family: "'Instrument Sans', sans-serif" } },
            },
            y: {
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { font: { family: "'Instrument Sans', sans-serif" } },
            },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    font: { family: "'Instrument Sans', sans-serif", size: 11 },
                    padding: 15,
                    usePointStyle: true,
                    pointStyle: 'circle',
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: { family: "'Instrument Sans', sans-serif", size: 14 },
                bodyFont: { family: "'Instrument Sans', sans-serif", size: 13 },
                padding: 12,
                cornerRadius: 8,
            },
        },
    };

    const getRankIcon = (index) => {
        if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
        if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
        if (index === 2) return <Trophy className="w-5 h-5 text-amber-600" />;
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-gray-500">#{index + 1}</span>;
    };

    const getRankBg = (index) => {
        if (index === 0) return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
        if (index === 1) return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
        if (index === 2) return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200';
        return 'bg-white border-gray-100';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: '#114124' }}
                            >
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                                <p className="text-xs text-gray-500">Course Analytics & Reports</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto">
                            {[
                                { id: 'overview', label: 'Overview' },
                                { id: 'petitions', label: 'Petitions' },
                                { id: 'vouchers', label: 'Vouchers' },
                                { id: 'job-postings', label: 'Job Posting Analytics' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        if (tab.id !== 'job-postings') setSelectedMonth(null);
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                    style={activeTab === tab.id ? { backgroundColor: '#114124' } : {}}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        icon={<FileText className="w-6 h-6" />}
                        title="Total Petition Requests"
                        value={totalPetitions}
                        trend={12}
                        color="#114124"
                    />
                    <StatCard
                        icon={<Ticket className="w-6 h-6" />}
                        title="Total Voucher Requests"
                        value={totalVouchers}
                        trend={8}
                        color="#3b82f6"
                    />
                    <StatCard
                        icon={<BookOpen className="w-6 h-6" />}
                        title="Total Courses Requested for Petition"
                        value={MOCK_COURSES.length}
                        trend={2}
                        color="#8b5cf6"
                    />
                </div>

                {activeTab === 'overview' && (
                    <>
                        {/* Separate Trend Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Petition Requests Trend */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center gap-2 mb-6">
                                    <Activity className="w-5 h-5" style={{ color: '#114124' }} />
                                    <h2 className="text-lg font-semibold text-gray-800">Petition Requests Trend</h2>
                                </div>
                                <div className="h-72">
                                    <Line data={petitionTrendData} options={{
                                        ...lineChartOptions,
                                        plugins: {
                                            ...lineChartOptions.plugins,
                                            legend: { display: false },
                                        },
                                    }} />
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Total This Period</p>
                                        <p className="text-2xl font-bold" style={{ color: '#114124' }}>
                                            {MONTHLY_DATA.petitions.reduce((a, b) => a + b, 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Growth</p>
                                        <p className="text-lg font-semibold text-green-600 flex items-center gap-1 justify-end">
                                            <ArrowUp className="w-4 h-4" />
                                            {Math.round(((MONTHLY_DATA.petitions[5] - MONTHLY_DATA.petitions[0]) / MONTHLY_DATA.petitions[0]) * 100)}%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Voucher Requests Trend */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center gap-2 mb-6">
                                    <Activity className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-lg font-semibold text-gray-800">Voucher Requests Trend</h2>
                                </div>
                                <div className="h-72">
                                    <Line data={voucherTrendData} options={{
                                        ...lineChartOptions,
                                        plugins: {
                                            ...lineChartOptions.plugins,
                                            legend: { display: false },
                                        },
                                    }} />
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Total This Period</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {MONTHLY_DATA.vouchers.reduce((a, b) => a + b, 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Growth</p>
                                        <p className="text-lg font-semibold text-green-600 flex items-center gap-1 justify-end">
                                            <ArrowUp className="w-4 h-4" />
                                            {Math.round(((MONTHLY_DATA.vouchers[5] - MONTHLY_DATA.vouchers[0]) / MONTHLY_DATA.vouchers[0]) * 100)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Combined Bar Chart */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                            <div className="flex items-center gap-2 mb-6">
                                <BarChart3 className="w-5 h-5" style={{ color: '#114124' }} />
                                <h2 className="text-lg font-semibold text-gray-800">
                                    Petitions and Vouchers by Course (Top 6)
                                </h2>
                            </div>
                            <div className="h-80">
                                <Bar data={combinedChartData} options={combinedBarOptions} />
                            </div>
                        </div>

                        {/* Top Courses Leaderboards */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Top Petitions */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Award className="w-5 h-5" style={{ color: '#114124' }} />
                                    <h2 className="text-lg font-semibold text-gray-800">Top Courses - Petitions</h2>
                                </div>
                                <div className="space-y-3">
                                    {[...MOCK_COURSES]
                                        .sort((a, b) => b.petitions - a.petitions)
                                        .slice(0, 5)
                                        .map((course, index) => (
                                            <div
                                                key={course.id}
                                                className={`flex items-center gap-4 p-3 rounded-lg border ${getRankBg(index)} transition-all hover:shadow-md`}
                                            >
                                                {getRankIcon(index)}
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800">{course.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-500"
                                                                style={{
                                                                    width: `${(course.petitions / topPetitionCourse.petitions) * 100}%`,
                                                                    backgroundColor: '#114124',
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-bold" style={{ color: '#114124' }}>
                                                        {course.petitions}
                                                    </span>
                                                    <div className={`flex items-center gap-1 text-xs ${
                                                        course.trend >= 0 ? 'text-green-600' : 'text-red-500'
                                                    }`}>
                                                        {course.trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                                        {Math.abs(course.trend)}%
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Top Vouchers */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-lg font-semibold text-gray-800">Top Courses - Vouchers</h2>
                                </div>
                                <div className="space-y-3">
                                    {[...MOCK_COURSES]
                                        .sort((a, b) => b.vouchers - a.vouchers)
                                        .slice(0, 5)
                                        .map((course, index) => (
                                            <div
                                                key={course.id}
                                                className={`flex items-center gap-4 p-3 rounded-lg border ${getRankBg(index)} transition-all hover:shadow-md`}
                                            >
                                                {getRankIcon(index)}
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800">{course.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-500"
                                                                style={{
                                                                    width: `${(course.vouchers / topVoucherCourse.vouchers) * 100}%`,
                                                                    backgroundColor: '#3b82f6',
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-bold text-blue-600">
                                                        {course.vouchers}
                                                    </span>
                                                    <div className={`flex items-center gap-1 text-xs ${
                                                        course.trend >= 0 ? 'text-green-600' : 'text-red-500'
                                                    }`}>
                                                        {course.trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                                        {Math.abs(course.trend)}%
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {/* Doughnut Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <PieChart className="w-5 h-5" style={{ color: '#114124' }} />
                                    <h2 className="text-lg font-semibold text-gray-800">Petitions Distribution</h2>
                                </div>
                                <div className="h-72">
                                    <Doughnut data={petitionsDoughnutData} options={doughnutOptions} />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <PieChart className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-lg font-semibold text-gray-800">Vouchers Distribution</h2>
                                </div>
                                <div className="h-72">
                                    <Doughnut data={vouchersDoughnutData} options={doughnutOptions} />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'petitions' && (
                    <div className="space-y-6">
                        {/* Hero Card for Top Course */}
                        <div
                            className="rounded-xl p-6 text-white"
                            style={{
                                background: 'linear-gradient(135deg, #114124 0%, #1a5c35 50%, #22804a 100%)',
                            }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Crown className="w-6 h-6 text-yellow-400" />
                                <span className="text-sm font-medium text-green-200">Top Performing Course</span>
                            </div>
                            <h3 className="text-3xl font-bold mb-1">{topPetitionCourse.name}</h3>
                            <p className="text-green-200 mb-4">Leading in petition submissions</p>
                            <div className="flex items-center gap-8">
                                <div>
                                    <p className="text-4xl font-bold">{topPetitionCourse.petitions}</p>
                                    <p className="text-sm text-green-200">Total Petitions</p>
                                </div>
                                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
                                    <TrendingUp className="w-5 h-5" />
                                    <span className="font-semibold">+{topPetitionCourse.trend}%</span>
                                    <span className="text-sm text-green-200">this month</span>
                                </div>
                            </div>
                        </div>

                        {/* Full Petitions Bar Chart */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <BarChart3 className="w-5 h-5" style={{ color: '#114124' }} />
                                <h2 className="text-lg font-semibold text-gray-800">Petitions by Course</h2>
                            </div>
                            <div className="h-[500px]">
                                <Bar data={petitionsChartData} options={barChartOptions} />
                            </div>
                        </div>

                        {/* All Courses Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-lg font-semibold text-gray-800">All Courses - Petitions</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Rank
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Course
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Petitions
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Share
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Trend
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {[...MOCK_COURSES]
                                            .sort((a, b) => b.petitions - a.petitions)
                                            .map((course, index) => (
                                                <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">{getRankIcon(index)}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <p className="font-medium text-gray-800">{course.name}</p>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="font-semibold" style={{ color: '#114124' }}>
                                                            {course.petitions}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        width: `${(course.petitions / totalPetitions) * 100}%`,
                                                                        backgroundColor: '#114124',
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-sm text-gray-500">
                                                                {((course.petitions / totalPetitions) * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                                course.trend >= 0
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-red-100 text-red-700'
                                                            }`}
                                                        >
                                                            {course.trend >= 0 ? (
                                                                <ArrowUp className="w-3 h-3" />
                                                            ) : (
                                                                <ArrowDown className="w-3 h-3" />
                                                            )}
                                                            {Math.abs(course.trend)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'vouchers' && (
                    <div className="space-y-6">
                        {/* Hero Card for Top Course */}
                        <div
                            className="rounded-xl p-6 text-white"
                            style={{
                                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
                            }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Crown className="w-6 h-6 text-yellow-400" />
                                <span className="text-sm font-medium text-blue-200">Top Performing Course</span>
                            </div>
                            <h3 className="text-3xl font-bold mb-1">{topVoucherCourse.name}</h3>
                            <p className="text-blue-200 mb-4">Leading in voucher requests</p>
                            <div className="flex items-center gap-8">
                                <div>
                                    <p className="text-4xl font-bold">{topVoucherCourse.vouchers}</p>
                                    <p className="text-sm text-blue-200">Total Voucher Requests</p>
                                </div>
                                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
                                    <TrendingUp className="w-5 h-5" />
                                    <span className="font-semibold">+{topVoucherCourse.trend}%</span>
                                    <span className="text-sm text-blue-200">this month</span>
                                </div>
                            </div>
                        </div>

                        {/* Full Vouchers Bar Chart */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <BarChart3 className="w-5 h-5 text-blue-500" />
                                <h2 className="text-lg font-semibold text-gray-800">Voucher Requests by Course</h2>
                            </div>
                            <div className="h-[500px]">
                                <Bar data={vouchersChartData} options={barChartOptions} />
                            </div>
                        </div>

                        {/* All Courses Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-lg font-semibold text-gray-800">All Courses - Voucher Requests</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Rank
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Course
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Vouchers
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Share
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Trend
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {[...MOCK_COURSES]
                                            .sort((a, b) => b.vouchers - a.vouchers)
                                            .map((course, index) => (
                                                <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">{getRankIcon(index)}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <p className="font-medium text-gray-800">{course.name}</p>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="font-semibold text-blue-600">
                                                            {course.vouchers}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        width: `${(course.vouchers / totalVouchers) * 100}%`,
                                                                        backgroundColor: '#3b82f6',
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-sm text-gray-500">
                                                                {((course.vouchers / totalVouchers) * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                                course.trend >= 0
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-red-100 text-red-700'
                                                            }`}
                                                        >
                                                            {course.trend >= 0 ? (
                                                                <ArrowUp className="w-3 h-3" />
                                                            ) : (
                                                                <ArrowDown className="w-3 h-3" />
                                                            )}
                                                            {Math.abs(course.trend)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'job-postings' && (
                    <JobPostingAnalytics
                        data={JOB_POSTING_WITH_OPEN}
                        applicationsData={USER_APPLICATIONS_DATA}
                        jobDemandData={JOB_DEMAND_DATA}
                        selectedMonth={selectedMonth}
                        setSelectedMonth={setSelectedMonth}
                    />
                )}
            </main>
        </div>
    );
};

// Job Posting Analytics Component
const JobPostingAnalytics = ({ data, applicationsData, jobDemandData, selectedMonth, setSelectedMonth }) => {
    const chartRef = React.useRef(null);
    const [jobFilter, setJobFilter] = useState('all');

    // Calculate totals
    const totalPostings = data.reduce((sum, d) => sum + d.total, 0);
    const totalFilled = data.reduce((sum, d) => sum + d.filled, 0);
    const totalExpired = data.reduce((sum, d) => sum + d.expired, 0);
    const totalOpen = data.reduce((sum, d) => sum + d.open, 0);

    // Get filtered jobs for selected month
    const getFilteredJobs = () => {
        if (!selectedMonth || !selectedMonth.jobs) return [];
        if (jobFilter === 'all') return selectedMonth.jobs;
        return selectedMonth.jobs.filter(job => job.status === jobFilter);
    };

    // Stacked bar chart data
    const stackedBarData = {
        labels: data.map(d => `${d.month.substring(0, 3)} ${d.year}`),
        datasets: [
            {
                label: 'Filled',
                data: data.map(d => d.filled),
                backgroundColor: 'rgba(34, 197, 94, 0.85)',
                borderColor: '#16a34a',
                borderWidth: 1,
                borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 },
                borderSkipped: false,
            },
            {
                label: 'Expired',
                data: data.map(d => d.expired),
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                borderColor: '#dc2626',
                borderWidth: 1,
                borderRadius: 0,
                borderSkipped: false,
            },
            {
                label: 'Open',
                data: data.map(d => d.open),
                backgroundColor: 'rgba(59, 130, 246, 0.85)',
                borderColor: '#2563eb',
                borderWidth: 1,
                borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                borderSkipped: false,
            },
        ],
    };

    // Trend line chart data
    const trendLineData = {
        labels: applicationsData.labels,
        datasets: [
            {
                label: 'User Applications',
                data: applicationsData.applications,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                yAxisID: 'y',
            },
            {
                label: 'Open Positions',
                data: applicationsData.openPositions,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                yAxisID: 'y1',
            },
        ],
    };

    const stackedBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                setSelectedMonth(data[index]);
            }
        },
        onHover: (event, elements) => {
            event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: { family: "'Instrument Sans', sans-serif", size: 12 },
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'rectRounded',
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                titleFont: { family: "'Instrument Sans', sans-serif", size: 14, weight: 'bold' },
                bodyFont: { family: "'Instrument Sans', sans-serif", size: 13 },
                padding: 16,
                cornerRadius: 10,
                callbacks: {
                    afterBody: (tooltipItems) => {
                        const index = tooltipItems[0].dataIndex;
                        const monthData = data[index];
                        return `\nTotal: ${monthData.total}\n\nClick to view details`;
                    },
                },
            },
        },
        scales: {
            x: {
                stacked: true,
                grid: { display: false },
                ticks: {
                    font: { family: "'Instrument Sans', sans-serif", size: 12 },
                    color: '#374151',
                },
            },
            y: {
                stacked: true,
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: {
                    font: { family: "'Instrument Sans', sans-serif" },
                    color: '#6b7280',
                },
                title: {
                    display: true,
                    text: 'Number of Job Postings',
                    font: { family: "'Instrument Sans', sans-serif", size: 12 },
                    color: '#6b7280',
                },
            },
        },
    };

    const trendLineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: { family: "'Instrument Sans', sans-serif", size: 12 },
                    padding: 20,
                    usePointStyle: true,
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                titleFont: { family: "'Instrument Sans', sans-serif", size: 14 },
                bodyFont: { family: "'Instrument Sans', sans-serif", size: 13 },
                padding: 14,
                cornerRadius: 10,
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    font: { family: "'Instrument Sans', sans-serif" },
                    color: '#374151',
                },
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: {
                    font: { family: "'Instrument Sans', sans-serif" },
                    color: '#8b5cf6',
                },
                title: {
                    display: true,
                    text: 'Applications',
                    font: { family: "'Instrument Sans', sans-serif", size: 12 },
                    color: '#8b5cf6',
                },
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: { drawOnChartArea: false },
                ticks: {
                    font: { family: "'Instrument Sans', sans-serif" },
                    color: '#3b82f6',
                },
                title: {
                    display: true,
                    text: 'Open Positions',
                    font: { family: "'Instrument Sans', sans-serif", size: 12 },
                    color: '#3b82f6',
                },
            },
        },
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'filled': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 className="w-4 h-4" /> };
            case 'expired': return { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-4 h-4" /> };
            case 'open': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <FolderOpen className="w-4 h-4" /> };
            default: return { bg: 'bg-gray-100', text: 'text-gray-700', icon: null };
        }
    };

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{totalPostings}</p>
                            <p className="text-sm text-gray-500">Total Postings</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{totalFilled}</p>
                            <p className="text-sm text-gray-500">Filled Positions</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{totalExpired}</p>
                            <p className="text-sm text-gray-500">Expired Postings</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{totalOpen}</p>
                            <p className="text-sm text-gray-500">Open Positions</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jobs in Demand Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Jobs in Demand</h2>
                    </div>
                    <span className="text-xs text-gray-500">Based on posting frequency</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {jobDemandData.slice(0, 5).map((job, index) => (
                        <div
                            key={job.title}
                            className={`p-4 rounded-xl border ${
                                index === 0
                                    ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'
                                    : 'bg-gray-50 border-gray-200'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                                <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                            </div>
                            <h3 className="font-semibold text-gray-800 text-sm mb-2">{job.title}</h3>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Postings:</span>
                                    <span className="font-medium text-gray-800">{job.count}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-green-600">Filled:</span>
                                    <span className="font-medium text-green-600">{job.filled}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-blue-600">Open:</span>
                                    <span className="font-medium text-blue-600">{job.open}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-red-600">Expired:</span>
                                    <span className="font-medium text-red-600">{job.expired}</span>
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-gray-200">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Avg. Applicants:</span>
                                    <span className="font-medium text-purple-600">
                                        {Math.round(job.totalApplicants / job.count)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stacked Bar Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-purple-600" />
                            <h2 className="text-lg font-semibold text-gray-800">Job Postings by Month</h2>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            Click a bar to view job details
                        </span>
                    </div>
                    <div className="h-80">
                        <Bar ref={chartRef} data={stackedBarData} options={stackedBarOptions} />
                    </div>
                </div>

                {/* Selected Month Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {selectedMonth ? (
                        <>
                            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-purple-600" />
                                        <h3 className="font-semibold text-gray-800">
                                            {selectedMonth.month} {selectedMonth.year}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setSelectedMonth(null)}
                                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <button
                                        onClick={() => setJobFilter('filled')}
                                        className={`p-3 rounded-lg text-center transition-all ${
                                            jobFilter === 'filled' ? 'bg-green-100 ring-2 ring-green-500' : 'bg-gray-50 hover:bg-green-50'
                                        }`}
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                                        <p className="text-lg font-bold text-green-600">{selectedMonth.filled}</p>
                                        <p className="text-xs text-gray-500">Filled</p>
                                    </button>
                                    <button
                                        onClick={() => setJobFilter('expired')}
                                        className={`p-3 rounded-lg text-center transition-all ${
                                            jobFilter === 'expired' ? 'bg-red-100 ring-2 ring-red-500' : 'bg-gray-50 hover:bg-red-50'
                                        }`}
                                    >
                                        <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                                        <p className="text-lg font-bold text-red-600">{selectedMonth.expired}</p>
                                        <p className="text-xs text-gray-500">Expired</p>
                                    </button>
                                    <button
                                        onClick={() => setJobFilter('open')}
                                        className={`p-3 rounded-lg text-center transition-all ${
                                            jobFilter === 'open' ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-50 hover:bg-blue-50'
                                        }`}
                                    >
                                        <FolderOpen className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                                        <p className="text-lg font-bold text-blue-600">{selectedMonth.open}</p>
                                        <p className="text-xs text-gray-500">Open</p>
                                    </button>
                                </div>
                                <button
                                    onClick={() => setJobFilter('all')}
                                    className={`w-full p-2 rounded-lg text-sm font-medium transition-all ${
                                        jobFilter === 'all'
                                            ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500'
                                            : 'bg-gray-100 text-gray-600 hover:bg-purple-50'
                                    }`}
                                >
                                    Show All ({selectedMonth.total})
                                </button>

                                {/* Visual breakdown */}
                                <div className="mt-5 pt-5 border-t border-gray-100">
                                    <p className="text-xs text-gray-500 mb-3">Distribution</p>
                                    <div className="h-4 rounded-full overflow-hidden flex">
                                        <div
                                            className="bg-green-500 transition-all duration-300"
                                            style={{ width: `${(selectedMonth.filled / selectedMonth.total) * 100}%` }}
                                        />
                                        <div
                                            className="bg-red-500 transition-all duration-300"
                                            style={{ width: `${(selectedMonth.expired / selectedMonth.total) * 100}%` }}
                                        />
                                        <div
                                            className="bg-blue-500 transition-all duration-300"
                                            style={{ width: `${(selectedMonth.open / selectedMonth.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <BarChart3 className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="font-medium text-gray-700 mb-2">No Month Selected</h3>
                            <p className="text-sm text-gray-500">
                                Click on any bar in the chart to view job listings for that month
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Job Listings Table for Selected Month */}
            {selectedMonth && selectedMonth.jobs && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">
                                    Job Posting for {selectedMonth.month} {selectedMonth.year}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Showing {getFilteredJobs().length} of {selectedMonth.total} jobs
                                    {jobFilter !== 'all' && ` (filtered by ${jobFilter})`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {['all', 'filled', 'open', 'expired'].map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setJobFilter(filter)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            jobFilter === filter
                                                ? filter === 'filled' ? 'bg-green-500 text-white'
                                                : filter === 'open' ? 'bg-blue-500 text-white'
                                                : filter === 'expired' ? 'bg-red-500 text-white'
                                                : 'bg-purple-500 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Job Title
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Company
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Applicants
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {getFilteredJobs().map((job) => {
                                    const colors = getStatusColor(job.status);
                                    return (
                                        <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                                        <Briefcase className="w-4 h-4 text-purple-600" />
                                                    </div>
                                                    <span className="font-medium text-gray-800">{job.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {job.company}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                                    {colors.icon}
                                                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                    <span className="font-semibold text-gray-800">{job.applicants}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {getFilteredJobs().length === 0 && (
                        <div className="p-8 text-center">
                            <p className="text-gray-500">No jobs found with the selected filter.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Trend Lines */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Applications vs Open Positions Trend</h2>
                </div>
                <div className="h-80">
                    <Line data={trendLineData} options={trendLineOptions} />
                </div>
            </div>

            {/* All Months Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        <h2 className="text-lg font-semibold text-gray-800">All Months Overview</h2>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Month
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Total
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Filled
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Expired
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Open
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Distribution
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((month, index) => (
                                <tr
                                    key={index}
                                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                                        selectedMonth?.month === month.month ? 'bg-purple-50' : ''
                                    }`}
                                    onClick={() => setSelectedMonth(month)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium text-gray-800">
                                                {month.month} {month.year}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="font-bold text-gray-900">{month.total}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                            <CheckCircle2 className="w-3 h-3" />
                                            {month.filled}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                            <XCircle className="w-3 h-3" />
                                            {month.expired}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                            <FolderOpen className="w-3 h-3" />
                                            {month.open}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="w-40 h-2.5 rounded-full overflow-hidden flex bg-gray-200">
                                            <div
                                                className="bg-green-500"
                                                style={{ width: `${(month.filled / month.total) * 100}%` }}
                                            />
                                            <div
                                                className="bg-red-500"
                                                style={{ width: `${(month.expired / month.total) * 100}%` }}
                                            />
                                            <div
                                                className="bg-blue-500"
                                                style={{ width: `${(month.open / month.total) * 100}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ icon, title, value, trend, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
            <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}15` }}
            >
                <div style={{ color }}>{icon}</div>
            </div>
            {trend !== undefined && (
                <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                >
                    {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {Math.abs(trend)}%
                </span>
            )}
        </div>
        <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{title}</p>
        </div>
    </div>
);

export default AdminDashboard;
