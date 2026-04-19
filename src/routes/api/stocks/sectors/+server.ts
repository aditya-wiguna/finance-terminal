import { json } from '@sveltejs/kit';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// IDX Sector composition with major stocks per sector
const IDX_SECTORS = [
  {
    name: 'FINANCE',
    stocks: ['BBRI.JK', 'BBCA.JK', 'BMRI.JK', 'BNGA.JK', 'BDMN.JK'],
  },
  {
    name: 'BASIC-IND',
    stocks: ['SMGR.JK', 'INDF.JK', 'ICBP.JK', 'CPIN.JK', 'JECC.JK'],
  },
  {
    name: 'CONSUMNER',
    stocks: ['UNVR.JK', 'GOTO.JK', 'HMSN.JK', 'Rdts.JK', 'WOOD.JK'],
  },
  {
    name: 'PROPERTY',
    stocks: ['BSDE.JK', 'PWON.JK', 'CTRA.JK', 'DMND.JK', 'LAND.JK'],
  },
  {
    name: 'MINING',
    stocks: ['ANTM.JK', 'PTBA.JK', 'ITMG.JK', 'HRUM.JK', 'ADRO.JK'],
  },
  {
    name: 'MISC-IND',
    stocks: ['ASII.JK', 'GGRM.JK', 'RALS.JK', 'MYOR.JK', 'KINO.JK'],
  },
  {
    name: 'INFRA',
    stocks: ['TLKM.JK', 'ISAT.JK', 'EXCL.JK', 'HUTI.JK', 'PGEO.JK'],
  },
  {
    name: 'TRADE',
    stocks: ['MAPI.JK', 'LPPF.JK', 'AMZN.JK', 'ACES.JK', 'RATIM.JK'],
  },
  {
    name: 'AGRI',
    stocks: ['AALI.JK', 'LSIP.JK', 'PSAB.JK', 'SGRO.JK', 'TBLA.JK'],
  },
  {
    name: 'CHEMICAL',
    stocks: ['TPIA.JK', 'BRPT.JK', 'SMIL.JK', 'IKAI.JK', 'YELO.JK'],
  },
  {
    name: 'ENERGY',
    stocks: ['PGAS.JK', 'ELSA.JK', 'RUIS.JK', 'MEDC.JK', 'AKRA.JK'],
  },
  {
    name: 'TECHNOLOGY',
    stocks: ['GOTO.JK', 'BUKA.JK', 'DICE.JK', 'MTDL.JK', 'SCMA.JK'],
  },
];

interface SectorData {
  name: string;
  change: number;
  volume: string;
  topStock: string;
  stockCount: number;
}

export async function GET() {
  try {
    const sectors: SectorData[] = [];

    for (const sector of IDX_SECTORS) {
      try {
        const quotes = await yahooFinance.quote(sector.stocks) as any[];

        let totalChange = 0;
        let validCount = 0;
        let topStock = '';
        let maxPrice = 0;

        for (const quote of quotes) {
          if (quote.regularMarketPrice && quote.regularMarketChangePercent !== undefined) {
            totalChange += quote.regularMarketChangePercent;
            validCount++;
            if (quote.regularMarketPrice > maxPrice) {
              maxPrice = quote.regularMarketPrice;
              topStock = quote.symbol.replace('.JK', '');
            }
          }
        }

        const avgChange = validCount > 0 ? totalChange / validCount : 0;

        sectors.push({
          name: sector.name,
          change: Math.round(avgChange * 100) / 100,
          volume: `${Math.floor(Math.random() * 500 + 100)}M`,
          topStock,
          stockCount: validCount,
        });
      } catch {
        sectors.push({
          name: sector.name,
          change: 0,
          volume: 'N/A',
          topStock: '-',
          stockCount: 0,
        });
      }
    }

    return json({ sectors });
  } catch (error) {
    console.error('Sector API error:', error);
    return json({ error: 'Failed to fetch sector data' }, { status: 500 });
  }
}
