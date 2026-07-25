"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CopyAddress } from '@/components/shared/CopyAddress';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { mockTransactions, Transaction } from '@/lib/mock/transactions';
import { formatDate } from '@/lib/utils/format';
import { Search, Download, Filter } from 'lucide-react';
import { generateCSV, CSVColumn } from '@/lib/utils/csv';

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = mockTransactions.filter(tx => 
    tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.payerAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const columns: CSVColumn<Transaction>[] = [
      { header: 'Date', key: (tx) => formatDate(tx.timestamp) },
      { header: 'Payer', key: 'payerAddress' },
      { header: 'Tx Hash', key: 'txHash' },
      { header: 'Source', key: 'source' },
      { header: 'Amount (USDC)', key: 'amountUsdc' },
      { header: 'Amount (NGN)', key: 'amountNgn' },
      { header: 'FX Rate', key: 'fxRate' },
      { header: 'Status', key: 'status' }
    ];

    const csvContent = generateCSV(filteredTransactions, columns);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Format date as YYYY-MM-DD
    const dateStr = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `bettapay-transactions-${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            View all your incoming payments and settlements.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border/50 bg-brand-surface">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button onClick={handleExportCSV} variant="outline" className="border-border/50 bg-brand-surface">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="bg-brand-surface border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search by hash or address..." 
              className="pl-9 bg-background/50 border-border/50 focus-visible:ring-brand-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-[180px]">Date</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Tx Hash</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount (USDC)</TableHead>
                  <TableHead className="text-right">Amount (NGN)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-border/50 hover:bg-muted/30">
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(tx.timestamp)}
                      </TableCell>
                      <TableCell>
                        <CopyAddress address={tx.payerAddress} />
                      </TableCell>
                      <TableCell>
                        <CopyAddress address={tx.txHash} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tx.source}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <CurrencyDisplay amount={tx.amountUsdc} currency="USDC" />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        <CurrencyDisplay amount={tx.amountNgn} currency="NGN" showDecimals={false} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={tx.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
