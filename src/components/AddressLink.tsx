interface Props {
  address: string;
  className?: string;
}

/**
 * Links a venue's address to a Google Maps search — works identically across
 * browsers/devices, unlike Safari's native address auto-detection (iOS-only,
 * and silently fails whenever the text doesn't fully match its address pattern).
 */
export function AddressLink({ address, className }: Props): React.ReactElement {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return (
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {address}
    </a>
  );
}
