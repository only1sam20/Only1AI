'use client';

import { useEffect, useState } from 'react';
import { api, MarketplaceListing } from '../lib/api';

export function MarketplaceBrowser() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api<MarketplaceListing[]>('/marketplace/listings')
      .then(setListings)
      .catch(() => setMessage('Marketplace templates could not be loaded right now.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-panel" aria-label="Loading marketplace"><div className="skeleton" /><div className="skeleton" /></div>;
  if (!listings.length) return <section className="empty-panel"><span className="empty-icon">◇</span><h2>{message ? 'Marketplace unavailable' : 'Curated templates are coming'}</h2><p>{message || 'Published creator templates will appear here after marketplace review.'}</p></section>;

  return <section className="marketplace-grid" aria-label="Marketplace listings">{listings.map((listing) => <article className="listing-card" key={listing.id}><p className="eyebrow">CURATED FRAMEWORK</p><h2>{listing.title}</h2><p>{listing.description}</p><footer><span>Educational template</span><time dateTime={listing.createdAt}>Added {new Date(listing.createdAt).toLocaleDateString()}</time></footer></article>)}</section>;
}
