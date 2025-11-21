
import { ParsedUrlQuery } from 'querystring';

export interface FilterOptions {
    status?: string[];
    priority?: string[];
    assignee?: string[];
    tags?: string[];
    search?: string;
    dueDate?: {
        gte?: Date;
        lte?: Date;
    };
}

export interface SortOption {
    field: string;
    direction: 'asc' | 'desc';
}

export interface PaginationOptions {
    page: number;
    pageSize: number;
}

export interface QueryOptions {
    filters: FilterOptions;
    sort: SortOption[];
    pagination: PaginationOptions;
}

export class FilterUtils {
    static parseQuery(query: ParsedUrlQuery): QueryOptions {
        const filters: FilterOptions = {};
        const sort: SortOption[] = [];
        const pagination: PaginationOptions = {
            page: 1,
            pageSize: 20,
        };

        // 1. Parse Filters
        if (query['filter[status]']) {
            filters.status = this.parseArray(query['filter[status]']);
        }
        if (query['filter[priority]']) {
            filters.priority = this.parseArray(query['filter[priority]']);
        }
        if (query['filter[assignee]']) {
            filters.assignee = this.parseArray(query['filter[assignee]']);
        }
        if (query['filter[tags]']) {
            filters.tags = this.parseArray(query['filter[tags]']);
        }
        if (query.search) {
            filters.search = query.search as string;
        }

        // Date range
        if (query['filter[dueDate][gte]'] || query['filter[dueDate][lte]']) {
            filters.dueDate = {};
            if (query['filter[dueDate][gte]']) {
                filters.dueDate.gte = new Date(query['filter[dueDate][gte]'] as string);
            }
            if (query['filter[dueDate][lte]']) {
                filters.dueDate.lte = new Date(query['filter[dueDate][lte]'] as string);
            }
        }

        // 2. Parse Sorting
        if (query.sort) {
            const sortParams = (query.sort as string).split(',');
            sortParams.forEach((param) => {
                const direction = param.startsWith('-') ? 'desc' : 'asc';
                const field = param.replace(/^-/, '');
                sort.push({ field, direction });
            });
        } else {
            // Default sort
            sort.push({ field: 'createdAt', direction: 'desc' });
        }

        // 3. Parse Pagination
        if (query.page) {
            pagination.page = parseInt(query.page as string, 10) || 1;
        }
        if (query.pageSize) {
            pagination.pageSize = parseInt(query.pageSize as string, 10) || 20;
        }

        return { filters, sort, pagination };
    }

    private static parseArray(value: string | string[]): string[] {
        if (Array.isArray(value)) {
            return value;
        }
        return value.split(',');
    }
}
