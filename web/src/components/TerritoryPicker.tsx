import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

interface Province {
  name: string;
  code: string;
  identifier: string;
}
interface Municipality {
  name: string;
  code: string;
  identifier: string;
  provinceCode: string;
}

interface TerritoryPickerProps {
  /** Called when the user selects a final municipality */
  onSelect: (opts: { region?: string; province: string; municipality: string; provinceCode: string }) => void;
  /** Placeholder values (for edit forms) */
  defaultProvince?: string;
  defaultMunicipality?: string;
}

export default function TerritoryPicker({ onSelect, defaultProvince = '', defaultMunicipality = '' }: TerritoryPickerProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [province, setProvince] = useState(defaultProvince);
  const [municipality, setMunicipality] = useState(defaultMunicipality);
  const [loadingP, setLoadingP] = useState(false);
  const [loadingM, setLoadingM] = useState(false);

  // Load provinces once on mount
  useEffect(() => {
    setLoadingP(true);
    api.get<Province[] | { error: string }>('/api/territories/provinces')
      .then((d) => {
        if (Array.isArray(d)) setProvinces(d);
      })
      .catch(() => {/* offline graceful degradation */})
      .finally(() => setLoadingP(false));
  }, []);

  // Load municipalities when province changes
  useEffect(() => {
    if (!provinceCode) { setMunicipalities([]); return; }
    setLoadingM(true);
    api.get<Municipality[] | { error: string }>(`/api/territories/municipalities?provinceCode=${provinceCode}`)
      .then((d) => {
        if (Array.isArray(d)) setMunicipalities(d);
      })
      .catch(() => {})
      .finally(() => setLoadingM(false));
  }, [provinceCode]);

  const handleProvince = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const opt = e.target.selectedOptions[0];
    const code = opt?.dataset.code ?? '';
    const name = opt?.textContent ?? '';
    setProvinceCode(code);
    setProvince(name);
    setMunicipality('');
    onSelect({ province: name, municipality: '', provinceCode: code });
  }, [onSelect]);

  const handleMunicipality = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.selectedOptions[0]?.textContent ?? '';
    setMunicipality(name);
    onSelect({ province, municipality: name, provinceCode });
  }, [onSelect, province, provinceCode]);

  return (
    <div className="territory-picker">
      {/* Province */}
      <div className="field">
        <label htmlFor="tp-province">Province / Provincia</label>
        <select
          id="tp-province"
          value={provinceCode}
          onChange={handleProvince}
          disabled={loadingP}
          aria-label="Select province"
        >
          <option value="">{loadingP ? 'Loading…' : 'Select a province'}</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code} data-code={p.code}>
              {p.name}
            </option>
          ))}
        </select>
        {/* Show freeform fallback if API fails */}
        {!loadingP && provinces.length === 0 && (
          <input
            id="tp-province-fb"
            type="text"
            placeholder="Type province name"
            value={province}
            onChange={(e) => { setProvince(e.target.value); onSelect({ province: e.target.value, municipality, provinceCode }); }}
            maxLength={80}
            style={{ marginTop: 8 }}
          />
        )}
      </div>

      {/* Municipality */}
      {(provinceCode || province) && (
        <div className="field">
          <label htmlFor="tp-municipality">Municipality / Municipio</label>
          <select
            id="tp-municipality"
            value={municipality}
            onChange={handleMunicipality}
            disabled={loadingM || !provinceCode}
            aria-label="Select municipality"
          >
            <option value="">{loadingM ? 'Loading…' : 'Select a municipality'}</option>
            {municipalities.map((m) => (
              <option key={m.code} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
          {/* Freeform fallback */}
          {!loadingM && municipalities.length === 0 && provinceCode && (
            <input
              type="text"
              placeholder="Type municipality name"
              value={municipality}
              onChange={(e) => { setMunicipality(e.target.value); onSelect({ province, municipality: e.target.value, provinceCode }); }}
              maxLength={80}
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
