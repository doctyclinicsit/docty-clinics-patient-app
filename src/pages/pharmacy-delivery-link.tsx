import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, MapPin, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PublicDeliveryLink {
  token: string;
  expiresAt: number;
  patientName: string;
  patientMobileLast4: string;
  submitted: boolean;
}

interface LocationSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
}

const defaultDeliveryPin = { latitude: 17.385, longitude: 78.4867 };
let leafletLoader: Promise<any> | null = null;

function loadLeaflet() {
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletLoader) return leafletLoader;

  leafletLoader = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-leaflet-css', 'true');
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error('Unable to load map.'));
    document.body.appendChild(script);
  });

  return leafletLoader;
}

function fileToImage(file: File) {
  return new Promise<{ name: string; type: string; data: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, data: String(reader.result || '') });
    reader.onerror = () => reject(new Error('Unable to read prescription image.'));
    reader.readAsDataURL(file);
  });
}

export default function PharmacyDeliveryLinkPage() {
  const { token = '' } = useParams();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [link, setLink] = useState<PublicDeliveryLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<LocationSearchResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({
    address: '',
    area: '',
    city: 'Hyderabad',
    pincode: '',
    landmark: '',
    latitude: '',
    longitude: '',
  });
  const [prescriptionImage, setPrescriptionImage] = useState<{ name: string; type: string; data: string } | null>(null);

  useEffect(() => {
    if (!link || isSubmitted || !mapElementRef.current) return undefined;

    let cancelled = false;
    loadLeaflet()
      .then((Leaflet) => {
        if (cancelled || !mapElementRef.current) return;
        const latitude = Number(form.latitude) || defaultDeliveryPin.latitude;
        const longitude = Number(form.longitude) || defaultDeliveryPin.longitude;

        if (!leafletMapRef.current) {
          const map = Leaflet.map(mapElementRef.current, {
            zoomControl: true,
            attributionControl: false,
          }).setView([latitude, longitude], 15);
          Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);
          const marker = Leaflet.marker([latitude, longitude], { draggable: true }).addTo(map);

          const updateFromLatLng = (latLng: { lat: number; lng: number }) => {
            setForm((current) => ({
              ...current,
              latitude: latLng.lat.toFixed(6),
              longitude: latLng.lng.toFixed(6),
            }));
          };

          marker.on('dragend', () => updateFromLatLng(marker.getLatLng()));
          map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
            marker.setLatLng(event.latlng);
            updateFromLatLng(event.latlng);
          });

          leafletMapRef.current = map;
          markerRef.current = marker;
          window.setTimeout(() => map.invalidateSize(), 150);
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load map.'));

    return () => {
      cancelled = true;
    };
  }, [form.latitude, form.longitude, isSubmitted, link]);

  useEffect(() => {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !markerRef.current || !leafletMapRef.current) return;
    markerRef.current.setLatLng([latitude, longitude]);
    leafletMapRef.current.panTo([latitude, longitude]);
  }, [form.latitude, form.longitude]);

  useEffect(() => {
    fetch(`/api/pharmacy/delivery-link?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || 'Unable to open delivery link.');
        setLink(body.link);
        setIsSubmitted(Boolean(body.link?.submitted));
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Unable to open delivery link.';
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    const query = locationSearch.trim();
    if (query.length < 3 || isSubmitted) {
      setLocationResults([]);
      setIsSearchingLocation(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsSearchingLocation(true);
      fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=in&q=${encodeURIComponent(
          query
        )}`,
        {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        }
      )
        .then(async (response) => {
          if (!response.ok) throw new Error('Unable to search location.');
          const body = await response.json();
          setLocationResults(Array.isArray(body) ? body : []);
        })
        .catch((error) => {
          if (error?.name !== 'AbortError') {
            setLocationResults([]);
            toast.error(error instanceof Error ? error.message : 'Unable to search location.');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearchingLocation(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isSubmitted, locationSearch]);

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error('Upload a JPG, PNG, or WebP prescription image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Upload a prescription image smaller than 5 MB.');
      return;
    }
    try {
      setPrescriptionImage(await fileToImage(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to read prescription image.');
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location sharing is not supported on this device.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
        setIsLocating(false);
        toast.success('Location captured.');
      },
      () => {
        setIsLocating(false);
        toast.error('Unable to capture location.');
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
    );
  };

  const selectLocationResult = (result: LocationSearchResult) => {
    const address = result.address || {};
    const area = address.neighbourhood || address.suburb || address.city_district || address.road || '';
    const city = address.city || address.town || address.village || form.city || 'Hyderabad';
    setForm((current) => ({
      ...current,
      area: current.area || area,
      city,
      pincode: current.pincode || address.postcode || '',
      latitude: Number(result.lat).toFixed(6),
      longitude: Number(result.lon).toFixed(6),
    }));
    setLocationSearch(result.display_name);
    setLocationResults([]);
    toast.success('Location selected. Adjust the pin if needed.');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/pharmacy/delivery-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...form,
          prescriptionImage,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to submit delivery details.');
      setIsSubmitted(true);
      toast.success('Delivery details submitted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit delivery details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!link) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md rounded-xl">
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-bold">Delivery link unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {loadError || 'Please ask the pharmacy team to share a new link.'}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-xl">
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <img src="/docty-logo-mark.png" alt="Docty" className="h-10 w-10 rounded-xl" />
              <CardTitle>Delivery Details</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              For {link.patientName} · mobile ending {link.patientMobileLast4}
            </p>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
                Delivery details have been submitted. The pharmacy team can continue your order.
              </div>
            ) : (
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="delivery-address">House / flat / building</Label>
                  <Input
                    id="delivery-address"
                    value={form.address}
                    onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-area">Area / locality</Label>
                    <Input
                      id="delivery-area"
                      value={form.area}
                      onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-city">City</Label>
                    <Input
                      id="delivery-city"
                      value={form.city}
                      onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-pincode">Pincode</Label>
                    <Input
                      id="delivery-pincode"
                      value={form.pincode}
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, pincode: event.target.value.replace(/\D/g, '').slice(0, 6) }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-landmark">Landmark</Label>
                    <Input
                      id="delivery-landmark"
                      value={form.landmark}
                      onChange={(event) => setForm((current) => ({ ...current, landmark: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-location-search">Search location</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="delivery-location-search"
                      value={locationSearch}
                      placeholder="Search apartment, area, or landmark"
                      className="pl-9"
                      autoComplete="off"
                      onChange={(event) => setLocationSearch(event.target.value)}
                    />
                    {isSearchingLocation && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
                    {locationResults.length > 0 && (
                      <div className="absolute z-[1001] mt-1 max-h-64 w-full overflow-auto rounded-md border bg-white shadow-lg">
                        {locationResults.map((result) => (
                          <button
                            key={result.place_id}
                            type="button"
                            className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
                            onClick={() => selectLocationResult(result)}
                          >
                            <span className="font-semibold text-slate-900">
                              {result.address?.road ||
                                result.address?.neighbourhood ||
                                result.address?.suburb ||
                                result.address?.city_district ||
                                result.display_name.split(',')[0]}
                            </span>
                            <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{result.display_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button type="button" variant="outline" className="w-full rounded-full" onClick={useCurrentLocation} disabled={isLocating}>
                  {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                  {form.latitude && form.longitude ? 'Use current location again' : 'Use current location'}
                </Button>
                <div className="space-y-2">
                  <div
                    ref={mapElementRef}
                    className="h-72 overflow-hidden rounded-lg border bg-slate-100"
                    aria-label="Delivery location map"
                  />
                  <p className="text-xs text-muted-foreground">
                    Drag the pin or tap the map to set the exact delivery location.
                    {form.latitude && form.longitude
                      ? ` Selected: ${Number(form.latitude).toFixed(5)}, ${Number(form.longitude).toFixed(5)}`
                      : ' Use current location or move the pin before submitting.'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-prescription">Prescription image</Label>
                  <Input id="delivery-prescription" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} />
                  {prescriptionImage && (
                    <p className="text-xs text-muted-foreground">
                      <Upload className="mr-1 inline h-3 w-3" />
                      {prescriptionImage.name}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Delivery Details
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
