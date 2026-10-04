export const formatDateToLocal = (dateStr: string, locale: string = 'en-US') => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        // Plain YYYY-MM-DD strings parse as UTC midnight; format in UTC so they don't shift a day.
        ...(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? {timeZone: 'UTC'} : {})
    };
    const formatter = new Intl.DateTimeFormat(locale, options);
    return formatter.format(date);
}

export const generatePagination = (currentPage: number, totalPages: number) => {
    if (totalPages <= 7) {
        return Array.from({length: totalPages}, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
        return [1, 2, 3, '...', totalPages-1, totalPages];
    }
    if (currentPage >= totalPages-2) {
        return [1, 2, '...', totalPages-2, totalPages-1, totalPages];
    }
    return [1, '...', currentPage-1, currentPage, currentPage+1, '...', totalPages]
}