// Proxies the DR Government's JCE/Luhn cédula checksum validator. This is a
// format/checksum check only — the upstream API does not return a registered
// name, so we cannot confirm the cédula belongs to a specific person.
export async function validateCedulaFormat(id: string): Promise<boolean> {
  if (!/^\d{11}$/.test(id)) return false;
  try {
    const res = await fetch(`https://api.digital.gob.do/v3/cedulas/${id}/validate`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return false;
    const data = await res.json() as { valid?: boolean };
    return data.valid === true;
  } catch {
    return false;
  }
}
