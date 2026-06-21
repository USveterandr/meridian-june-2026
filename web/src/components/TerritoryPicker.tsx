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
interface Town {
  name: string;
  code: string;
  identifier: string;
  municipioCode: string;
  provinceCode: string;
}

interface TerritoryPickerProps {
  /** Called when the user selects a final municipality/town */
  onSelect: (opts: { region?: string; province: string; municipality: string; town?: string; provinceCode: string }) => void;
  /** Placeholder values (for edit forms) */
  defaultProvince?: string;
  defaultMunicipality?: string;
  defaultTown?: string;
}

export default function TerritoryPicker({ onSelect, defaultProvince = '', defaultMunicipality = '', defaultTown = '' }: TerritoryPickerProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [towns, setTowns] = useState<Town[]>([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [municipioCode, setMunicipioCode] = useState('');
  const [province, setProvince] = useState(defaultProvince);
  const [municipality, setMunicipality] = useState(defaultMunicipality);
  const [town, setTown] = useState(defaultTown);
  const [loadingP, setLoadingP] = useState(false);
  const [loadingM, setLoadingM] = useState(false);
  const [loadingT, setLoadingT] = useState(false);

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

  // Load towns/sectors when municipality changes
  useEffect(() => {
    if (!provinceCode || !municipioCode) { setTowns([]); return; }
    setLoadingT(true);
    api.get<Town[] | { error: string }>(`/api/territories/towns?provinceCode=${provinceCode}&municipioCode=${municipioCode}`)
      .then((d) => {
        if (Array.isArray(d)) setTowns(d);
      })
      .catch(() => {})
      .finally(() => setLoadingT(false));
  }, [provinceCode, municipioCode]);

  const handleProvince = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const opt = e.target.selectedOptions[0];
    const code = opt?.dataset.code ?? '';
    const name = opt?.textContent ?? '';
    setProvinceCode(code);
    setProvince(name);
    setMunicipioCode('');
    setMunicipality('');
    setTown('');
    onSelect({ province: name, municipality: '', town: '', provinceCode: code });
  }, [onSelect]);

  const handleMunicipality = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const opt = e.target.selectedOptions[0];
    const code = opt?.dataset.code ?? '';
    const name = opt?.textContent ?? '';
    setMunicipioCode(code);
    setMunicipality(name);
    setTown('');
    onSelect({ province, municipality: name, town: '', provinceCode });
  }, [onSelect, province, provinceCode]);

  const handleTown = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.selectedOptions[0]?.textContent ?? '';
    setTown(name);
    onSelect({ province, municipality, town: name, provinceCode });
  }, [onSelect, province, municipality, provinceCode]);

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
            onChange={(e) => { setProvince(e.target.value); onSelect({ province: e.target.value, municipality, town, provinceCode }); }}
            maxLength={80}
            style={{ marginTop: 8 }}
          />
        )}
      </div>

      {/* Municipality */}
      {(provinceCode || province) && (
        <div className="field">
          <label htmlFor="tp-municipality">Municipality / Municipio</label>
          {provinceCode && (
            <select
              id="tp-municipality"
              value={municipality}
              onChange={handleMunicipality}
              disabled={loadingM}
              aria-label="Select municipality"
            >
              <option value="">{loadingM ? 'Loading…' : 'Select a municipality'}</option>
              {municipalities.map((m) => (
                <option key={m.code} value={m.name} data-code={m.code}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          {/* Freeform fallback — used when the province itself is freeform (no code to
              look up municipalities by) or when the municipality lookup came back empty. */}
          {!loadingM && (!provinceCode || municipalities.length === 0) && (
            <input
              type="text"
              placeholder="Type municipality name"
              value={municipality}
              onChange={(e) => { setMunicipality(e.target.value); onSelect({ province, municipality: e.target.value, town, provinceCode }); }}
              maxLength={80}
              style={{ marginTop: provinceCode ? 8 : 0 }}
            />
          )}
        </div>
      )}

      {/* Town / Sector */}
      {(municipioCode || (municipality && !provinceCode)) && (
        <div className="field">
          <label htmlFor="tp-town">Town / Sector — Pueblo / Sector</label>
          {municipioCode && (
            <select
              id="tp-town"
              value={town}
              onChange={handleTown}
              disabled={loadingT}
              aria-label="Select town or sector"
            >
              <option value="">{loadingT ? 'Loading…' : 'Select a town/sector'}</option>
              {towns.map((t) => (
                <option key={t.code} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          {/* Freeform fallback — used when the municipality itself is freeform, or
              when the town lookup came back empty. */}
          {!loadingT && (!municipioCode || towns.length === 0) && (
            <input
              type="text"
              placeholder="Type town/sector name"
              value={town}
              onChange={(e) => { setTown(e.target.value); onSelect({ province, municipality, town: e.target.value, provinceCode }); }}
              maxLength={80}
              style={{ marginTop: municipioCode ? 8 : 0 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
