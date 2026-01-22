import React from 'react';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

export default function SkillRadarChart({ userSkills, requiredSkills }) {
    // Get all unique skill labels
    const labels = [...new Set([
        ...Object.keys(userSkills || {}),
        ...Object.keys(requiredSkills || {})
    ])];

    const data = {
        labels,
        datasets: [
            {
                label: 'Required Skills',
                data: labels.map(label => requiredSkills?.[label] || 0),
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
            },
            {
                label: 'Your Skills',
                data: labels.map(label => userSkills?.[label] || 0),
                backgroundColor: 'rgba(147, 197, 253, 0.2)',
                borderColor: 'rgba(147, 197, 253, 1)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointBackgroundColor: 'rgba(147, 197, 253, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(147, 197, 253, 1)',
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            r: {
                angleLines: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                pointLabels: {
                    font: {
                        size: 12,
                        family: "'Instrument Sans', sans-serif"
                    },
                    color: '#374151'
                },
                suggestedMin: 0,
                suggestedMax: 100,
                ticks: {
                    stepSize: 20,
                    backdropColor: 'transparent',
                    color: '#9ca3af',
                    font: {
                        size: 10
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1f2937',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.raw}%`;
                    }
                }
            }
        },
        elements: {
            line: {
                tension: 0.1
            }
        }
    };

    return (
        <div className="w-full max-w-[300px] mx-auto">
            <Radar data={data} options={options} />
        </div>
    );
}
