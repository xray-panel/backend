/**
 * Какие версии нод принимает панель.
 *
 * Панель и нода XLADA выпускаются с одной версией продукта, поэтому ветка
 * XLADA — это 1.x. Но панель совместима и с официальными нодами Remnawave: у
 * них своя нумерация (2.x и 3.x), и для них пороги остаются апстримными.
 *
 * Разделять ветки обязательно. Нода XLADA — это форк апстримной 3.4.1, то есть
 * по возможностям она новее 2.7.0, хотя её версия 1.1.x меньше численно.
 * Сравнивать обе ветки одним числом нельзя: именно на этом панель отказывалась
 * запускать собственную ноду 1.1.3 с сообщением «Outdated version 1.1.3».
 *
 * Откуда взялись пороги:
 *   - 1.1.0 — первая версия ветки XLADA (форк ноды 3.4.1, умеет всё нужное);
 *   - 2.7.0 — апстримный порог поддержки плагинов;
 *   - 3.3.0 — апстримный порог геопроверки (geocheck).
 *
 * Сравнение сделано разбором строки, а не через semver: контракт не тянет
 * зависимостей, кроме zod, и обе стороны (панель и веб-интерфейс) получают
 * одно и то же правило из этого файла.
 */
export const XLADA_NODE_MIN_VERSION = '1.1.0';
export const REMNAWAVE_NODE_MIN_VERSION = '2.7.0';
export const REMNAWAVE_NODE_MIN_VERSION_GEOCHECK = '3.3.0';

type TNodeVersion = [major: number, minor: number, patch: number];

const NODE_VERSION_PATTERN = /(\d+)\.(\d+)\.(\d+)/;

const parseNodeVersion = (raw?: null | string): null | TNodeVersion => {
    if (!raw) {
        return null;
    }

    const match = NODE_VERSION_PATTERN.exec(raw);

    if (match === null) {
        return null;
    }

    return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const isLower = (left: TNodeVersion, right: TNodeVersion): boolean => {
    if (left[0] !== right[0]) {
        return left[0] < right[0];
    }

    if (left[1] !== right[1]) {
        return left[1] < right[1];
    }

    return left[2] < right[2];
};

const isVersionAtLeast = (raw: null | string | undefined, required: string): boolean => {
    const version = parseNodeVersion(raw);
    const minimum = parseNodeVersion(required);

    if (version === null || minimum === null) {
        return false;
    }

    return !isLower(version, minimum);
};

/** Ветка XLADA нумеруется версией продукта (1.x), апстрим начинается с 2.x. */
export const isXladaNodeVersion = (raw?: null | string): boolean => {
    const version = parseNodeVersion(raw);

    return version !== null && version[0] < 2;
};

/** Название ветки ноды — подставляется в текст сообщений. */
export const getNodeBrandName = (raw?: null | string): string =>
    isXladaNodeVersion(raw) ? 'XLADA' : 'Remnawave';

/** Минимальная версия для конкретной ноды — её показываем в сообщениях. */
export const getRequiredNodeVersion = (raw?: null | string, isGeocheck = false): string => {
    if (isXladaNodeVersion(raw)) {
        return XLADA_NODE_MIN_VERSION;
    }

    return isGeocheck ? REMNAWAVE_NODE_MIN_VERSION_GEOCHECK : REMNAWAVE_NODE_MIN_VERSION;
};

/** Нода устарела настолько, что панель откажется с ней работать. */
export const isNodeVersionOutdated = (raw?: null | string): boolean =>
    !isVersionAtLeast(raw, getRequiredNodeVersion(raw));

/** Поддерживает ли нода геопроверку. */
export const isGeocheckSupported = (raw?: null | string): boolean =>
    isVersionAtLeast(raw, getRequiredNodeVersion(raw, true));
