import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageSize?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Table grid wrapper */}
      <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="text-xs font-black text-slate-505">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-slate-50/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-xs text-slate-750 font-semibold p-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-xs text-slate-400 font-semibold">
                  No records matching this workspace list filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-2 py-1">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount() || 1} ({data.length} records)
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8.5 rounded-lg gap-1 border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8.5 rounded-lg gap-1 border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
