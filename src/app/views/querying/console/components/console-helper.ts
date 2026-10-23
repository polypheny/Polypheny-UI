export function usesAdvancedConsole(lang: string) {
    return lang === 'mql' || lang === 'cypher';
}

export const QUERY_LANGUAGES = Array.from(
    ['SQL', 'MQL', 'CYPHER', 'CQL', 'PIG']
);
