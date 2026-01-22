import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet + bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom job marker icon
const createJobIcon = (matchPercentage) => {
    const color = matchPercentage >= 80 ? '#22c55e' : 
                  matchPercentage >= 60 ? '#eab308' : '#ef4444';
    
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                width: 36px;
                height: 36px;
                background: ${color};
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                border: 2px solid white;
            ">
                <span style="
                    transform: rotate(45deg);
                    color: white;
                    font-weight: bold;
                    font-size: 11px;
                ">$</span>
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
    });
};

// Custom seminar marker icon
const createSeminarIcon = () => {
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                width: 36px;
                height: 36px;
                background: #3b82f6;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                border: 2px solid white;
            ">
                <span style="
                    transform: rotate(45deg);
                    color: white;
                    font-size: 14px;
                ">📚</span>
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
    });
};

// User location marker
const userLocationIcon = L.divIcon({
    className: 'custom-marker',
    html: `
        <div style="
            width: 20px;
            height: 20px;
            background: #3b82f6;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 0 2px #3b82f6, 0 2px 5px rgba(0,0,0,0.3);
        "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

export default function JobMap({ items, center, onMarkerClick, selectedItem, type }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const circleRef = useRef(null);

    useEffect(() => {
        // Initialize map
        if (!mapInstanceRef.current && mapRef.current) {
            mapInstanceRef.current = L.map(mapRef.current).setView(center, 13);

            // Add tile layer (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstanceRef.current);

            // Add user location marker and radius circle
            L.marker(center, { icon: userLocationIcon })
                .addTo(mapInstanceRef.current)
                .bindPopup('Your Location');

            // Add search radius circle
            circleRef.current = L.circle(center, {
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                radius: 3000, // 3km radius
                weight: 2
            }).addTo(mapInstanceRef.current);
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Update markers when items change
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add new markers
        items.forEach(item => {
            if (item.latitude && item.longitude) {
                const icon = type === 'jobs' 
                    ? createJobIcon(item.matchPercentage || 0)
                    : createSeminarIcon();

                const marker = L.marker([item.latitude, item.longitude], { icon })
                    .addTo(mapInstanceRef.current);

                // Add tooltip with title and location
                const tooltipContent = type === 'jobs'
                    ? `${item.title} - ${item.location}`
                    : `${item.title} - ${item.location || item.city}`;

                marker.bindTooltip(tooltipContent, {
                    permanent: false,
                    direction: 'top',
                    offset: [0, -36]
                });

                // Create popup content
                const popupContent = type === 'jobs'
                    ? `
                        <div style="min-width: 150px;">
                            <h3 style="font-weight: bold; margin-bottom: 4px;">${item.title}</h3>
                            <p style="color: #666; font-size: 12px; margin-bottom: 4px;">${item.company}</p>
                            <p style="color: #666; font-size: 12px; margin-bottom: 8px;">${item.location}</p>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="
                                    padding: 2px 8px;
                                    border-radius: 9999px;
                                    font-size: 11px;
                                    font-weight: 500;
                                    background: ${item.matchPercentage >= 80 ? '#dcfce7' : item.matchPercentage >= 60 ? '#fef9c3' : '#fecaca'};
                                    color: ${item.matchPercentage >= 80 ? '#166534' : item.matchPercentage >= 60 ? '#854d0e' : '#991b1b'};
                                ">${item.matchPercentage}% Match</span>
                            </div>
                        </div>
                    `
                    : `
                        <div style="min-width: 150px;">
                            <h3 style="font-weight: bold; margin-bottom: 4px;">${item.title}</h3>
                            <p style="color: #666; font-size: 12px; margin-bottom: 4px;">${item.organizer}</p>
                            <p style="color: #666; font-size: 12px; margin-bottom: 4px;">📅 ${item.date}</p>
                            <p style="color: #666; font-size: 12px;">📍 ${item.location}</p>
                        </div>
                    `;

                marker.bindPopup(popupContent);

                marker.on('click', () => {
                    onMarkerClick && onMarkerClick(item);
                });

                markersRef.current.push(marker);
            }
        });
    }, [items, type, onMarkerClick]);

    // Highlight selected item
    useEffect(() => {
        if (!mapInstanceRef.current || !selectedItem) return;

        if (selectedItem.latitude && selectedItem.longitude) {
            mapInstanceRef.current.setView([selectedItem.latitude, selectedItem.longitude], 14);
        }
    }, [selectedItem]);

    return (
        <div 
            ref={mapRef} 
            className="w-full h-full"
            style={{ minHeight: '300px' }}
        />
    );
}
