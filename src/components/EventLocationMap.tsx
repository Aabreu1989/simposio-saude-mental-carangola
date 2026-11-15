import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation } from 'lucide-react';

class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('Map rendering caught error, using fallback:', err);
  }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-stone-50">
            <MapPin className="w-10 h-10 text-[#028090]" />
            <div className="font-bold text-sm text-[#0a3641]">
              UEMG Carangola · Praça Cel. Maximiano, 180 - Centro, Carangola - MG
            </div>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=UEMG+Carangola+MG"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a3641] text-white text-xs font-bold"
            >
              <Navigation className="w-4 h-4 text-[#ea7a38]" />
              <span>Abrir Rota no Google Maps</span>
            </a>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

const EVENT_LOCATION = {
  name: 'UEMG Carangola — Local do 1º Simpósio de Saúde Mental',
  address: 'Praça Cel. Maximiano, 180 - Centro, Carangola - MG, 36800-000',
  lat: -20.73385,
  lng: -42.0294
};

export const EventLocationMap: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(
    () => (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || ''
  );
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    if (!apiKey) {
      fetch('/api/maps/config')
        .then((res) => res.json())
        .then((data) => {
          if (data?.apiKey) {
            setApiKey(data.apiKey);
          }
        })
        .catch((err) => console.warn('Could not load Google Maps API key from server:', err));
    }
  }, [apiKey]);

  return (
    <section id="mapa-territorial" className="py-6 sm:py-8 bg-white border-t border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0a3641] text-[#ea7a38] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0a3641] tracking-tight">
                Local do Evento · UEMG Carangola
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500">
                {EVENT_LOCATION.address}
              </p>
            </div>
          </div>

          <a
            href="https://www.google.com/maps/dir/?api=1&destination=UEMG+Carangola+MG"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0a3641] hover:bg-[#0f4b59] text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <Navigation className="w-3.5 h-3.5 text-[#ea7a38]" />
            <span>Como Chegar</span>
          </a>
        </div>

        {/* Clean Compact Interactive Map */}
        <div className="rounded-xl overflow-hidden border border-stone-300 shadow-xs bg-stone-100 h-[220px] sm:h-[260px] w-full relative">
          <MapErrorBoundary>
            {apiKey ? (
              <APIProvider apiKey={apiKey} language="pt-BR" region="BR">
                <Map
                  id="carangola-event-map"
                  mapId="DEMO_MAP_ID"
                  defaultCenter={{ lat: EVENT_LOCATION.lat, lng: EVENT_LOCATION.lng }}
                  defaultZoom={16}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  gestureHandling="cooperative"
                  className="w-full h-full"
                  style={{ width: '100%', height: '100%' }}
                >
                  <AdvancedMarker
                    position={{ lat: EVENT_LOCATION.lat, lng: EVENT_LOCATION.lng }}
                    title={EVENT_LOCATION.name}
                    onClick={() => setShowInfo((prev) => !prev)}
                  >
                    <Pin
                      background="#d96522"
                      borderColor="#0a3641"
                      glyphColor="#ffffff"
                    />
                  </AdvancedMarker>

                  {showInfo && (
                    <InfoWindow
                      position={{ lat: EVENT_LOCATION.lat, lng: EVENT_LOCATION.lng }}
                      onCloseClick={() => setShowInfo(false)}
                    >
                      <div className="p-1 max-w-[240px]">
                        <div className="font-bold text-xs text-[#0a3641] leading-snug">
                          {EVENT_LOCATION.name}
                        </div>
                        <div className="text-[11px] text-stone-600 mt-1 leading-snug">
                          {EVENT_LOCATION.address}
                        </div>
                        <a
                          href="https://www.google.com/maps/dir/?api=1&destination=UEMG+Carangola+MG"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-[11px] font-bold text-[#d96522] underline"
                        >
                          Traçar rota no Google Maps →
                        </a>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-stone-50">
                <MapPin className="w-8 h-8 text-[#028090] animate-pulse" />
                <div className="text-sm font-bold text-[#0a3641]">
                  Carregando mapa da UEMG Carangola...
                </div>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=UEMG+Carangola+MG"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#d96522] font-semibold underline"
                >
                  Abrir localização diretamente no Google Maps
                </a>
              </div>
            )}
          </MapErrorBoundary>
        </div>
      </div>
    </section>
  );
};
