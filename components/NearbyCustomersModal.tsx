import React, { useState, useMemo, useCallback } from 'react';
import type { Customer, NearbyCustomer } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon, SearchIcon, LocationMarkerIcon, MapIcon } from './icons';
import { geocodeAddress } from '../services/geminiService';
import Spinner from './ui/Spinner';

// Haversine formula for distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};

interface NearbyCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
}

type SearchMode = 'radius' | 'region';
type SearchResult = (NearbyCustomer | { customer: Customer, addressType: '집' | '직장' })[];

const NearbyCustomersModal: React.FC<NearbyCustomersModalProps> = ({ isOpen, onClose, customers, onSelectCustomer }) => {
  const [mode, setMode] = useState<SearchMode>('radius');
  const [radiusQuery, setRadiusQuery] = useState('');
  const [searchRadius, setSearchRadius] = useState(3); // in km
  const [regionQuery, setRegionQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
      setIsLoading(true);
      setError('');
      setResults(null);

      try {
          if (mode === 'radius') {
              if (!radiusQuery.trim()) {
                  throw new Error('기준 위치를 입력해주세요.');
              }
              const centerCoords = await geocodeAddress(radiusQuery);
              if (!centerCoords || centerCoords.lat === 0) {
                  throw new Error(`'${radiusQuery}' 위치의 좌표를 찾을 수 없습니다. 주소를 더 상세히 입력해주세요.`);
              }

              const nearby: NearbyCustomer[] = [];
              customers.forEach(customer => {
                  if (customer.homeLat && customer.homeLng) {
                      const distance = calculateDistance(centerCoords.lat, centerCoords.lng, customer.homeLat, customer.homeLng);
                      if (distance <= searchRadius) {
                          nearby.push({ customer, distance, addressType: '집' });
                      }
                  }
                  if (customer.workLat && customer.workLng) {
                      const distance = calculateDistance(centerCoords.lat, centerCoords.lng, customer.workLat, customer.workLng);
                      if (distance <= searchRadius) {
                          nearby.push({ customer, distance, addressType: '직장' });
                      }
                  }
              });

              nearby.sort((a, b) => a.distance - b.distance);
              setResults(nearby);

          } else { // region search
              if (!regionQuery.trim()) {
                  throw new Error('검색할 지역을 입력해주세요.');
              }
              const lowerQuery = regionQuery.toLowerCase();
              const found: { customer: Customer, addressType: '집' | '직장' }[] = [];
              const foundCustomerIds = new Set<string>();

              customers.forEach(customer => {
                  if (customer.homeAddress && customer.homeAddress.toLowerCase().includes(lowerQuery)) {
                      found.push({ customer, addressType: '집' });
                      foundCustomerIds.add(customer.id);
                  }
              });
              customers.forEach(customer => {
                  if (customer.workAddress && customer.workAddress.toLowerCase().includes(lowerQuery) && !foundCustomerIds.has(customer.id)) {
                     found.push({ customer, addressType: '직장' });
                     foundCustomerIds.add(customer.id);
                  }
              });

              setResults(found);
          }
      } catch (err) {
          setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.');
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleCustomerClick = (customer: Customer) => {
      onSelectCustomer(customer);
      onClose();
  };

  return (
      <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full h-[80vh]">
          <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">내 주변 고객 찾기</h2>
              <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
          </div>
          <div className="p-6 flex-1 min-h-0 flex flex-col">
              <div className="flex justify-center p-1 bg-[var(--background-tertiary)] rounded-lg mb-6 flex-shrink-0">
                  <button onClick={() => setMode('radius')} className={`w-1/2 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'radius' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                      <LocationMarkerIcon className="h-5 w-5" /> 반경 검색
                  </button>
                  <button onClick={() => setMode('region')} className={`w-1/2 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'region' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                      <MapIcon className="h-5 w-5" /> 지역 검색
                  </button>
              </div>

              <div className="space-y-4 flex-shrink-0">
                  {mode === 'radius' ? (
                      <div className="flex items-center gap-2">
                          <input type="text" value={radiusQuery} onChange={e => setRadiusQuery(e.target.value)} placeholder="기준 위치 (예: 강남역)" className="flex-grow p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]" />
                          <select value={searchRadius} onChange={e => setSearchRadius(Number(e.target.value))} className="p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]">
                              <option value={1}>1km</option>
                              <option value={3}>3km</option>
                              <option value={5}>5km</option>
                              <option value={10}>10km</option>
                          </select>
                      </div>
                  ) : (
                      <input type="text" value={regionQuery} onChange={e => setRegionQuery(e.target.value)} placeholder="지역명 (예: 강남구, 역삼동)" className="w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]" />
                  )}
                  <button onClick={handleSearch} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[var(--background-accent)] text-[var(--text-on-accent)] font-semibold rounded-md hover:bg-[var(--background-accent-hover)] disabled:opacity-50">
                      <SearchIcon className="h-5 w-5" /> 검색
                  </button>
              </div>
              
              <div className="mt-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {isLoading && <div className="flex justify-center items-center h-full"><Spinner /></div>}
                {error && <p className="text-center text-sm text-[var(--text-danger)] bg-red-500/10 p-2 rounded-md">{error}</p>}
                {results && (
                    <div className="animate-fade-in">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">{results.length}명의 고객을 찾았습니다.</h3>
                        <div className="space-y-2">
                            {results.map((result, index) => (
                                <div key={`${result.customer.id}-${result.addressType}-${index}`} className="p-3 bg-[var(--background-primary)] border border-[var(--border-color)] rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-[var(--text-primary)]">{result.customer.name} <span className="text-xs font-normal text-[var(--text-muted)]">({result.addressType} 주소)</span></p>
                                        {'distance' in result ? (
                                            <p className="text-sm text-[var(--text-accent)] font-semibold">{result.distance.toFixed(2)} km</p>
                                        ) : (
                                            <p className="text-sm text-[var(--text-muted)] truncate max-w-xs">{result.addressType === '집' ? result.customer.homeAddress : result.customer.workAddress}</p>
                                        )}
                                    </div>
                                    <button onClick={() => handleCustomerClick(result.customer)} className="px-3 py-1.5 bg-[var(--background-accent-subtle)] text-[var(--text-accent)] rounded-md text-xs font-medium self-start">
                                        상세 보기
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>

          </div>
      </BaseModal>
  );
};

export default NearbyCustomersModal;
