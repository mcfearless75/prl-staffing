"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapContractor, MapSite } from "./coverage-map-client";

// Roughly centres the UK with Scotland fully in view on first paint, before
// FitBounds adjusts to the actual plotted points.
const DEFAULT_CENTER: [number, number] = [55.5, -4];
const DEFAULT_ZOOM = 6;

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || points.length === 0) return;
    fitted.current = true;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
  }, [map, points]);

  return null;
}

export default function LeafletCoverageMap({
  contractors,
  sites,
}: {
  contractors: MapContractor[];
  sites: MapSite[];
}) {
  const plottedContractors = contractors.filter(
    (c): c is MapContractor & { latitude: number; longitude: number } => c.latitude != null && c.longitude != null
  );
  const plottedSites = sites.filter(
    (s): s is MapSite & { latitude: number; longitude: number } => s.latitude != null && s.longitude != null
  );

  const allPoints: [number, number][] = [
    ...plottedContractors.map((c) => [c.latitude, c.longitude] as [number, number]),
    ...plottedSites.map((s) => [s.latitude, s.longitude] as [number, number]),
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "600px", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={allPoints} />

        {plottedSites.map((site) => (
          <CircleMarker
            key={`site-${site.id}`}
            center={[site.latitude, site.longitude]}
            radius={10}
            pathOptions={{ color: "#059669", fillColor: "#10b981", fillOpacity: 0.9, weight: 2 }}
          >
            <Popup>
              <p className="font-semibold text-emerald-700">{site.name}</p>
              <p className="text-xs text-gray-500">{site.company.name}</p>
            </Popup>
          </CircleMarker>
        ))}

        {plottedContractors.map((c) => (
          <CircleMarker
            key={`contractor-${c.id}`}
            center={[c.latitude, c.longitude]}
            radius={5}
            pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.7, weight: 1 }}
          >
            <Popup>
              <p className="font-semibold text-blue-700">{c.firstName} {c.lastName}</p>
              <p className="text-xs text-gray-500">{c.jobTitle || "No job title"}</p>
              <p className="text-xs text-gray-400">{c.status}</p>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="flex items-center gap-6 border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Subcontractor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-500" /> Client Site
        </span>
      </div>
    </div>
  );
}
