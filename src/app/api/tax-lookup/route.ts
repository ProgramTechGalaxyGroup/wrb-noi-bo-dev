import { NextResponse } from 'next/server';
import https from 'https';

// 🔧 CONFIGURATION
const VIETQR_API_URL = 'https://api.vietqr.io/v2/business';
const ESGOO_API_URL = 'https://esgoo.net/api-mst';
const API_TIMEOUT_MS = 8000;

const BROWSER_HEADERS = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

/**
 * Helper: Fetch URL using Node.js native https module
 */
function fetchUrl(url: string): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = https.get(
            {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                headers: BROWSER_HEADERS,
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => resolve({ status: res.statusCode || 500, body: data }));
            }
        );
        req.on('error', reject);
        req.setTimeout(API_TIMEOUT_MS, () => {
            req.destroy();
            reject(new Error('TIMEOUT'));
        });
    });
}

/**
 * Fetch from VietQR API
 */
async function fetchVietQR(taxCode: string) {
    try {
        const { status, body } = await fetchUrl(`${VIETQR_API_URL}/${taxCode}`);
        if (status !== 200) return null;
        const data = JSON.parse(body);
        if (data.code === '00' && data.data) {
            return {
                companyName: data.data.name || '',
                address: data.data.address || '',
                internationalName: data.data.internationalName || '',
                shortName: data.data.shortName || '',
            };
        }
        return null;
    } catch {
        console.log('[tax-lookup] VietQR failed, skipping');
        return null;
    }
}

/**
 * Fetch from Esgoo API
 * Note: Esgoo returns 2 different formats depending on the MST:
 *   Format A: { ten, mst, dt, dc, daidien, hoatdong, tinhtrang }
 *   Format B: { id, name, address, status, internationalName, shortName } (VietQR-like)
 */
async function fetchEsgoo(taxCode: string) {
    try {
        const { status, body } = await fetchUrl(`${ESGOO_API_URL}/${taxCode}.htm`);
        if (status !== 200) return null;
        const data = JSON.parse(body);
        if (data.error === 0 && data.data) {
            const d = data.data;
            // Detect format: 'ten' = Format A, 'name' = Format B
            const isFormatA = !!d.ten || !!d.dt;
            return {
                companyName: (isFormatA ? d.ten : d.name) || '',
                address: (isFormatA ? d.dc : d.address) || '',
                phone: d.dt || '',
                representative: d.daidien || '',
                startDate: d.hoatdong || '',
                status: (isFormatA ? d.tinhtrang : d.status) || '',
            };
        }
        return null;
    } catch {
        console.log('[tax-lookup] Esgoo failed, skipping');
        return null;
    }
}

/**
 * GET /api/tax-lookup?taxCode=0316794479
 * Calls both VietQR + Esgoo in parallel, merges best data from each.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taxCode = searchParams.get('taxCode')?.trim();

        if (!taxCode) {
            return NextResponse.json(
                { success: false, message: 'Tax code is required' },
                { status: 400 }
            );
        }

        if (!/^\d{10,14}$/.test(taxCode)) {
            return NextResponse.json(
                { success: false, message: 'Invalid tax code format. Must be 10-14 digits.' },
                { status: 400 }
            );
        }

        console.log(`[tax-lookup] Looking up: ${taxCode} (VietQR + Esgoo)`);

        // Call both APIs in parallel
        const [vietqr, esgoo] = await Promise.all([
            fetchVietQR(taxCode),
            fetchEsgoo(taxCode),
        ]);

        console.log(`[tax-lookup] VietQR: ${vietqr ? 'OK' : 'FAIL'}, Esgoo: ${esgoo ? 'OK' : 'FAIL'}`);

        // Need at least one source to succeed
        if (!vietqr && !esgoo) {
            return NextResponse.json(
                { success: false, message: 'Tax code not found' },
                { status: 404 }
            );
        }

        // Merge: prefer VietQR for name/address (more complete), Esgoo for phone/representative
        const merged = {
            taxCode,
            companyName: vietqr?.companyName || esgoo?.companyName || '',
            internationalName: vietqr?.internationalName || '',
            shortName: vietqr?.shortName || '',
            address: vietqr?.address || esgoo?.address || '',
            phone: esgoo?.phone || '',
            representative: esgoo?.representative || '',
            startDate: esgoo?.startDate || '',
            status: esgoo?.status || '',
        };

        console.log(`[tax-lookup] Merged result:`, JSON.stringify(merged));

        return NextResponse.json({ success: true, data: merged });
    } catch (error: any) {
        console.error('[tax-lookup] Error:', error.message);

        if (error.message === 'TIMEOUT') {
            return NextResponse.json(
                { success: false, message: 'Lookup timed out. Please try again.' },
                { status: 504 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Lookup failed. Please try again.' },
            { status: 500 }
        );
    }
}
