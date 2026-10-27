export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const area = String(req.query?.area || 'emmen').toLowerCase();
  const feeds = {
    emmen: 'https://www.112regiodrenthe.nl/gemeente/emmen/feed.xml',
    drenthe: 'https://www.112regiodrenthe.nl/feed.xml'
  };
  if (!feeds[area]) {
    return res.status(400).json({ error: 'Onbekende regio. Kies emmen of drenthe.' });
  }
  try {
    const response = await fetch(feeds[area], {
      headers: { 'User-Agent': 'P2000-Drenthe/1.0 (public RSS reader)', 'Accept': 'application/rss+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Meldingenbron antwoordde met HTTP ' + response.status);
    const xml = await response.text();
    if (!/<(?:rss|feed|rdf:RDF)\b/i.test(xml)) throw new Error('De bron leverde geen herkenbare RSS/Atom-feed');
    const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => m[2]);
    const decode = s => String(s || '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/\s+/g, ' ').trim();
    const field = (block, names) => {
      for (const name of names) {
        const re = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i');
        const m = block.match(re);
        if (m) return decode(m[1]);
      }
      return '';
    };
    const classify = text => {
      const s = text.toLowerCase();
      if (/brandweer|\bbrw\b|brandmelding/.test(s)) return 'Brandweer';
      if (/ambulance|\bambu\b|\ba1\b|\ba2\b/.test(s)) return 'Ambulance';
      if (/traumaheli|\bmmt\b/.test(s)) return 'MMT';
      if (/politie|\bprio politie\b/.test(s)) return 'Politie';
      return 'Hulpdienst';
    };
    const priority = text => {
      if (/\bA1\b|\bP1\b|prio\s*1|grip/i.test(text)) return 'P1';
      if (/\bA2\b|\bP2\b|prio\s*2/i.test(text)) return 'P2';
      return '—';
    };
    const items = blocks.map(block => {
      const title = field(block, ['title']);
      const description = field(block, ['description', 'summary', 'content']);
      const rawDate = field(block, ['pubDate', 'published', 'updated', 'dc:date']);
      const text = title + ' ' + description;
      const placeMatch = text.match(/Emmen|Klazienaveen|Nieuw-Dordrecht|Emmer-Compascuum|Schoonebeek|Zwartemeer|Erica|Nieuw-Amsterdam|Weiteveen|Odoorn|Borger|Coevorden|Assen|Hoogeveen|Sleen/i);
      let time = '';
      let date = '';
      if (rawDate) {
        const parsed = new Date(rawDate);
        if (!Number.isNaN(parsed.getTime())) {
          time = parsed.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' });
          date = parsed.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Amsterdam' });
        }
      }
      return { title: title || 'P2000-melding', description: description.slice(0, 500), date, time, place: placeMatch ? placeMatch[0] : (area === 'emmen' ? 'Emmen-regio' : 'Drenthe'), service: classify(text), priority: priority(text) };
    }).filter(item => item.title || item.description);
    return res.status(200).json({ area, updatedAt: new Date().toISOString(), items });
  } catch (error) {
    return res.status(502).json({ error: 'Live meldingen konden niet worden opgehaald: ' + (error?.message || 'onbekende fout') });
  }
}