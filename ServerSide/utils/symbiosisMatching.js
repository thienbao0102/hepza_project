const { removeDiacritics, escapeRegex } = require('./removeDiacritics');

const STOPWORDS = new Set([
    'chat', 'thai', 'phe', 'lieu', 'vun', 'cu', 'loai', 'khac', 'kho', 'sach', 'vo', 'manh', 'thua',
    'va', 'hoac', 'cac', 'nhung', 'cho', 'can', 'muon', 'co', 'the', 'tu', 'he', 'thong', 'noi', 'bo',
    'da', 'qua', 'chuan', 'muc', 'do', 'dang', 'phat', 'sinh', 'ra',
]);

const WEAK_TOKENS = new Set([
    'tai', 'che', 'cong', 'nghiep', 'su', 'dung', 'xu', 'ly', 'dong', 'goi', 'nguyen', 'lieu',
    'bi', 'chua', 'dung', 'cu', 'moi', 'hong', 'gay', 'kho', 'uoc', 'sach', 'ban', 'loi',
    'mau', 'kich', 'thuoc', 'hon', 'hop', 'lan', 'du', 'duoi', 'tren', 'trong', 'ngoai', 'noi', 'ngoai',
    'mot', 'lan', 'hang', 'ngay', 'tuan', 'thang', 'nam', 'phu', 'pham', 'phu', 'lieu', 'phuc', 'vu',
]);

const PROCESS_TOKENS = new Set([
    'che', 'xu', 'ly', 'phan', 'loai', 'lam', 'kho', 'rua', 'nghien', 'bam', 'ep', 'cat',
    'dot', 'nung', 'loc', 'thu', 'gom', 'quan', 'luu', 'kho', 'thay', 'the'
]);

const BROAD_MATERIAL_TOKENS = new Set([
    'nhua', 'go', 'vai', 'sat', 'thep', 'kim', 'loai', 'giay', 'nuoc', 'dau', 'hoa', 'chat', 'cao', 'su'
]);

const STRONG_MATERIAL_TOKENS = new Set([
    'cotton', 'poly', 'polyester', 'pe', 'pp', 'pet', 'hdpe', 'ldpe', 'pvc', 'nylon', 'nilon',
    'carton', 'bia', 'kraft', 'pallet', 'mun', 'cua', 'dam', 'mau', 'thong', 'cao', 'su',
    'tro', 'bay', 'xi', 'than', 'nacl', 'muoi', 'acid', 'axit', 'kiem', 'bot', 'bong', 'soi', 'chi',
    'nhot', 'mo', 'inox', 'nhom', 'dong', 'kem', 'thiec', 'phep', 'gach', 'cat', 'da', 'son', 'keo'
]);

const FORM_FACTOR_TOKENS = new Set([
    'bao', 'tui', 'thung', 'hop', 'can', 'chai', 'phuy', 'cuon', 'loi', 'tam', 'manh', 'hat',
    'bot', 'bun', 'bui', 'soi', 'day', 'ong', 'khay', 'pallet', 'gieng', 'ghe', 'khung', 'mieng'
]);

const TOKEN_GROUPS = {
    plastic: ['nhua', 'nylon', 'nilon', 'pe', 'pp', 'pet', 'hdpe', 'ldpe', 'pvc', 'plastic'],
    textile: ['vai', 'cotton', 'poly', 'polyester', 'soi', 'chi', 'bong', 'det', 'nhuom'],
    wood: ['go', 'mun', 'cua', 'dam', 'pallet', 'thong'],
    paper: ['giay', 'carton', 'bia', 'kraft', 'loi'],
    oil: ['dau', 'nhot', 'mo'],
    ash: ['tro', 'bay', 'xi'],
    metal: ['sat', 'thep', 'nhom', 'dong', 'inox', 'kim', 'loai', 'kem', 'thiec'],
    chemical: ['hoa', 'chat', 'acid', 'axit', 'kiem', 'muoi', 'nacl', 'son', 'keo'],
    water: ['nuoc', 'thai', 'nhuom'],
    container: ['bao', 'bi', 'tui', 'thung', 'hop', 'can', 'chai', 'phuy', 'cuon', 'loi']
};

const MATERIAL_GROUPS = new Set(['plastic', 'textile', 'wood', 'paper', 'oil', 'ash', 'metal', 'chemical', 'water']);

const VARIANT_MAP = new Map([
    ['nilon', 'nylon'],
    ['ni', 'nylon'],
    ['long', 'nylon'],
    ['plastic', 'nhua'],
    ['axit', 'acid']
]);

const TOKEN_TO_GROUPS = Object.entries(TOKEN_GROUPS).reduce((acc, [group, tokens]) => {
    for (const token of tokens) {
        const normalized = VARIANT_MAP.get(token) || token;
        if (!acc.has(normalized)) acc.set(normalized, new Set());
        acc.get(normalized).add(group);
    }
    return acc;
}, new Map());

function normalizeForMatch(value = '') {
    if (!value || typeof value !== 'string') return '';
    let normalized = removeDiacritics(value);
    normalized = normalized.replace(/[\-_/,.()\[\]{}:;+]+/g, ' ');
    normalized = normalized.replace(/\s+/g, ' ').trim();
    const words = normalized.split(' ');
    const mapped = words.map((w) => VARIANT_MAP.get(w) || w);
    return mapped.join(' ');
}

const unique = (values) => Array.from(new Set(values));

const intersect = (a, b) => {
    const bSet = new Set(b);
    return a.filter((value) => bSet.has(value));
};

const collectGroups = (tokens) => unique(tokens.flatMap((token) => Array.from(TOKEN_TO_GROUPS.get(token) || [])));

function buildNgrams(tokens, size) {
    const result = [];
    for (let i = 0; i <= tokens.length - size; i++) {
        result.push(tokens.slice(i, i + size).join(' '));
    }
    return result;
}

function buildNameProfile(value = '') {
    const normalized = normalizeForMatch(value);
    const rawTokens = normalized.split(' ').filter((w) => w.length > 0);
    const tokens = rawTokens.filter((w) => !STOPWORDS.has(w));
    const scoringTokens = tokens.filter((w) => !WEAK_TOKENS.has(w));
    const anchorTokens = unique(tokens.filter((w) => (
        STRONG_MATERIAL_TOKENS.has(w)
        || FORM_FACTOR_TOKENS.has(w)
        || /^\d+$/.test(w)
        || (!WEAK_TOKENS.has(w) && !PROCESS_TOKENS.has(w) && w.length > 1)
    )));
    const weakTokens = unique(tokens.filter((w) => WEAK_TOKENS.has(w) || PROCESS_TOKENS.has(w)));
    const tokenGroups = collectGroups(tokens);
    const materialGroups = tokenGroups.filter((group) => MATERIAL_GROUPS.has(group));
    const formFactorGroups = tokenGroups.filter((group) => group === 'container');
    const bigrams = buildNgrams(rawTokens, 2);
    const trigrams = buildNgrams(rawTokens, 3);
    const meaningfulBigrams = buildNgrams(tokens, 2).filter((gram) => gram.split(' ').some((token) => anchorTokens.includes(token)));
    const length = rawTokens.length;
    const specificity = anchorTokens.filter((t) => !BROAD_MATERIAL_TOKENS.has(t)).length;
    const isShort = length <= 2;
    const isBroadOnly = anchorTokens.length > 0 && anchorTokens.every((t) => BROAD_MATERIAL_TOKENS.has(t));

    return {
        normalized,
        rawTokens,
        tokens,
        scoringTokens,
        importantTokens: anchorTokens,
        anchorTokens,
        weakTokens,
        tokenGroups,
        materialGroups,
        formFactorGroups,
        bigrams,
        trigrams,
        meaningfulBigrams,
        length,
        specificity,
        isShort,
        isBroadOnly
    };
}

function analyzeNameEvidence(reqProfile, candProfile) {
    const reqSet = new Set(reqProfile.scoringTokens);
    const candSet = new Set(candProfile.scoringTokens);
    const anchorOverlap = intersect(reqProfile.anchorTokens, candProfile.anchorTokens);
    const groupOverlap = intersect(reqProfile.tokenGroups, candProfile.tokenGroups);
    const materialGroupOverlap = intersect(reqProfile.materialGroups, candProfile.materialGroups);
    const formFactorOverlap = intersect(reqProfile.formFactorGroups, candProfile.formFactorGroups);
    const phraseOverlap = intersect(reqProfile.meaningfulBigrams, candProfile.meaningfulBigrams);
    const tokenOverlap = intersect([...reqSet], [...candSet]);
    const weakOverlap = intersect(reqProfile.weakTokens, candProfile.weakTokens);
    const hasMaterialConflict = reqProfile.materialGroups.length > 0
        && candProfile.materialGroups.length > 0
        && materialGroupOverlap.length === 0;
    const weakOnlyOverlap = tokenOverlap.length === 0 && anchorOverlap.length === 0 && phraseOverlap.length === 0 && weakOverlap.length > 0;
    const hasAnchorEvidence = anchorOverlap.length > 0 || phraseOverlap.length > 0;
    const hasGroupEvidence = materialGroupOverlap.length > 0 || formFactorOverlap.length > 0;

    return {
        tokenOverlap,
        anchorOverlap,
        groupOverlap,
        materialGroupOverlap,
        formFactorOverlap,
        phraseOverlap,
        weakOverlap,
        hasAnchorEvidence,
        hasGroupEvidence,
        weakOnlyOverlap,
        hasMaterialConflict
    };
}

function scoreNameMatch(requestName = '', candidateNames = []) {
    const reqProfile = buildNameProfile(requestName);
    const reqTokens = reqProfile.scoringTokens;

    if (reqTokens.length === 0 || candidateNames.length === 0) {
        return {
            score: 0,
            hasStrongNameEvidence: false,
            requiresSupportingEvidence: false,
            hasAnchorEvidence: false,
            hasGroupEvidence: false,
            weakOnlyOverlap: false,
            hasMaterialConflict: false
        };
    }

    let best = {
        score: 0,
        hasStrongNameEvidence: false,
        requiresSupportingEvidence: false,
        hasAnchorEvidence: false,
        hasGroupEvidence: false,
        weakOnlyOverlap: false,
        hasMaterialConflict: false
    };

    for (const candidateName of candidateNames) {
        const candProfile = buildNameProfile(candidateName);
        const candTokens = candProfile.scoringTokens;
        if (candTokens.length === 0) continue;

        const evidence = analyzeNameEvidence(reqProfile, candProfile);
        const reqSet = new Set(reqTokens);
        const candSet = new Set(candTokens);
        const matches = evidence.tokenOverlap.length;
        const unionSize = new Set([...reqSet, ...candSet]).size;
        const jaccard = unionSize > 0 ? matches / unionSize : 0;
        const coverage = reqSet.size > 0 ? matches / reqSet.size : 0;
        let score = (jaccard * 45) + (coverage * 45);

        if (evidence.phraseOverlap.length > 0) score += 12;
        if (evidence.anchorOverlap.length > 0) score += Math.min(18, evidence.anchorOverlap.length * 8);
        if (evidence.materialGroupOverlap.length > 0) score += 8;
        if (evidence.formFactorOverlap.length > 0) score += 5;
        if (evidence.weakOnlyOverlap) score = Math.min(score, 25);
        if (evidence.hasMaterialConflict) score = Math.min(score, 35);

        const hasStrongNameEvidence = evidence.hasAnchorEvidence || evidence.hasGroupEvidence;
        const requiresSupportingEvidence = reqSet.size === 1 && BROAD_MATERIAL_TOKENS.has([...reqSet][0]);

        if (!hasStrongNameEvidence) score = score * 0.6;
        if (requiresSupportingEvidence) score = Math.min(score, 65);
        if (reqProfile.normalized === candProfile.normalized) score = Math.max(score, 90);

        score = Math.min(100, Math.max(0, Math.round(score)));

        if (score > best.score || (score === best.score && (evidence.weakOnlyOverlap || evidence.hasMaterialConflict))) {
            best = {
                score,
                hasStrongNameEvidence,
                requiresSupportingEvidence,
                hasAnchorEvidence: evidence.hasAnchorEvidence,
                hasGroupEvidence: evidence.hasGroupEvidence,
                weakOnlyOverlap: evidence.weakOnlyOverlap,
                hasMaterialConflict: evidence.hasMaterialConflict
            };
        }
    }

    return best;
}

function collectCandidateNames(candidate = {}) {
    const candidateNames = [];
    if (candidate.wasteName) candidateNames.push(candidate.wasteName);
    if (Array.isArray(candidate.otherWasteName)) {
        candidateNames.push(...candidate.otherWasteName.filter(name => typeof name === 'string' && name.trim()));
    } else if (typeof candidate.otherWasteName === 'string' && candidate.otherWasteName.trim()) {
        candidateNames.push(candidate.otherWasteName);
    }
    return candidateNames;
}

function scoreSymbiosisMatch(request = {}, candidate = {}, direction = 'buy-to-sell') {
    if (!request || typeof request !== 'object' || !candidate || typeof candidate !== 'object') return null;

    const nameResult = scoreNameMatch(request.wasteName || '', collectCandidateNames(candidate));
    let score = nameResult.score;

    let codeMatch = false;
    if (direction === 'buy-to-sell') {
        const reqCode = request.desiredWasteCode;
        const candCode = candidate.wasteCode;
        codeMatch = Boolean(reqCode && candCode && String(reqCode).trim().toLowerCase() === String(candCode).trim().toLowerCase());
    } else {
        const reqCode = request.wasteCode;
        const candCode = candidate.desiredWasteCode;
        codeMatch = Boolean(reqCode && candCode && String(reqCode).trim().toLowerCase() === String(candCode).trim().toLowerCase());
    }
    if (codeMatch) score += 15;

    const reqGrs = request.industrialGrs;
    const candGrs = candidate.industrialGrs;
    const industrialGroupMatch = Boolean(reqGrs && candGrs && String(reqGrs).trim() === String(candGrs).trim());
    if (industrialGroupMatch) score += 5;

    const reqQty = typeof request.quantity === 'number' ? request.quantity : null;
    const candQty = typeof candidate.quantity === 'number' ? candidate.quantity : null;
    if (reqQty !== null && candQty !== null) {
        if (candQty >= reqQty) score += 3;
        else if (candQty >= reqQty * 0.5) score += 1;
    }

    const reqUnit = request.unit;
    const candUnit = candidate.unit;
    const unitMatch = Boolean(reqUnit && candUnit && String(reqUnit).trim().toLowerCase() === String(candUnit).trim().toLowerCase());
    if (unitMatch) score += 2;

    const reqPrice = typeof request.price === 'number' ? request.price : null;
    const candPrice = typeof candidate.price === 'number' ? candidate.price : null;
    if (reqPrice !== null && candPrice !== null) score += 1;

    const reqNotes = request.notes;
    const candNotes = candidate.notes;
    if (reqNotes && candNotes) {
        const reqN = normalizeForMatch(reqNotes);
        const candN = normalizeForMatch(candNotes);
        if (reqN && candN) {
            const reqWords = new Set(reqN.split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w) && !WEAK_TOKENS.has(w)));
            const candWords = new Set(candN.split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w) && !WEAK_TOKENS.has(w)));
            let noteMatches = 0;
            for (const w of reqWords) {
                if (candWords.has(w)) noteMatches++;
            }
            if (noteMatches >= 3) score += 3;
            else if (noteMatches >= 1) score += 1;
        }
    }

    score = Math.min(100, Math.max(0, Math.round(score)));

    const hasSupportSignal = codeMatch || industrialGroupMatch || unitMatch;
    const hasValidNameEvidence = nameResult.hasAnchorEvidence || nameResult.hasGroupEvidence || codeMatch;
    if (nameResult.weakOnlyOverlap || nameResult.hasMaterialConflict || !hasValidNameEvidence) {
        return null;
    }

    let matchTier;
    if (score >= 85) {
        matchTier = 1;
    } else if (score >= 65) {
        matchTier = 2;
    } else if (score >= 45 || (score >= 40 && nameResult.hasStrongNameEvidence && hasSupportSignal)) {
        matchTier = 3;
    } else {
        return null;
    }

    return { matchTier, matchScore: score };
}

const toTimestamp = (value) => {
    const timestamp = value ? new Date(value).getTime() : 0;
    return Number.isFinite(timestamp) ? timestamp : 0;
};

function dedupeAndSortMatches(matches = []) {
    const bestById = new Map();
    for (const match of matches) {
        if (!match?._id) continue;
        const key = String(match._id);
        const existing = bestById.get(key);
        if (!existing) {
            bestById.set(key, match);
            continue;
        }
        const tierDiff = (match.matchTier ?? 999) - (existing.matchTier ?? 999);
        if (tierDiff < 0) {
            bestById.set(key, match);
        } else if (tierDiff === 0) {
            const scoreDiff = (match.matchScore ?? 0) - (existing.matchScore ?? 0);
            if (scoreDiff > 0) bestById.set(key, match);
        }
    }

    return Array.from(bestById.values()).sort((a, b) => {
        const tierA = a.matchTier ?? 999;
        const tierB = b.matchTier ?? 999;
        if (tierA !== tierB) return tierA - tierB;

        const scoreA = a.matchScore ?? 0;
        const scoreB = b.matchScore ?? 0;
        if (scoreA !== scoreB) return scoreB - scoreA;

        const createdA = toTimestamp(a.createdAt);
        const createdB = toTimestamp(b.createdAt);
        if (createdA !== createdB) return createdB - createdA;

        const qtyA = typeof a.quantity === 'number' ? a.quantity : 0;
        const qtyB = typeof b.quantity === 'number' ? b.quantity : 0;
        return qtyB - qtyA;
    });
}

function buildCandidateRegexTerms(item = {}) {
    const terms = [];
    const profile = buildNameProfile(item.wasteName || '');
    const sources = [
        ...profile.trigrams,
        ...profile.bigrams,
        ...profile.anchorTokens,
        ...profile.tokenGroups.filter((group) => group !== 'container')
    ];

    for (const src of sources) {
        const escaped = escapeRegex(src);
        if (escaped && !terms.includes(escaped)) terms.push(escaped);
    }

    return terms;
}

module.exports = {
    normalizeForMatch,
    buildNameProfile,
    scoreNameMatch,
    scoreSymbiosisMatch,
    dedupeAndSortMatches,
    buildCandidateRegexTerms
};
