export type Language = 'javascript' | 'python' | 'php' | 'go';
export type Operation = 'create-payment-link' | 'list-transactions' | 'initiate-settlement';

export const codeSnippets: Record<Operation, Record<Language, string>> = {
  'create-payment-link': {
    javascript: `import { BettaPay } from '@bettapay/sdk';

const client = new BettaPay({
  apiKey: 'bp_live_YOUR_API_KEY',
  network: 'mainnet',
});

const link = await client.paymentLinks.create({
  label: 'My Product',
  currency: 'USDC',
  amount: 100,
  type: 'fixed',
  description: 'Payment for services',
});

console.log(link.url);
// Output: https://betta.pay/pay/link_xxx`,

    python: `from bettapay import BettaPay

client = BettaPay(
    api_key='bp_live_YOUR_API_KEY',
    network='mainnet'
)

link = client.payment_links.create(
    label='My Product',
    currency='USDC',
    amount=100,
    type='fixed',
    description='Payment for services'
)

print(link.url)
# Output: https://betta.pay/pay/link_xxx`,

    php: `<?php
require 'vendor/autoload.php';

use BettaPay\\Client;

$client = new Client([
    'api_key' => 'bp_live_YOUR_API_KEY',
    'network' => 'mainnet'
]);

$link = $client->paymentLinks->create([
    'label' => 'My Product',
    'currency' => 'USDC',
    'amount' => 100,
    'type' => 'fixed',
    'description' => 'Payment for services'
]);

echo $link->url;
// Output: https://betta.pay/pay/link_xxx`,

    go: `package main

import (
	"fmt"
	"github.com/bettapay/sdk-go"
)

func main() {
	client := bettapay.NewClient(
		bettapay.WithAPIKey("bp_live_YOUR_API_KEY"),
		bettapay.WithNetwork("mainnet"),
	)

	link, err := client.PaymentLinks.Create(ctx, &bettapay.CreatePaymentLinkRequest{
		Label:       "My Product",
		Currency:    "USDC",
		Amount:      100,
		Type:        "fixed",
		Description: "Payment for services",
	})

	if err != nil {
		panic(err)
	}

	fmt.Println(link.URL)
	// Output: https://betta.pay/pay/link_xxx
}`,
  },

  'list-transactions': {
    javascript: `import { BettaPay } from '@bettapay/sdk';

const client = new BettaPay({
  apiKey: 'bp_live_YOUR_API_KEY',
  network: 'mainnet',
});

const transactions = await client.transactions.list({
  limit: 20,
  offset: 0,
  status: 'completed',
});

console.log(transactions.data);
// Output: [{ id: 'txn_xxx', amount: 100, ... }]`,

    python: `from bettapay import BettaPay

client = BettaPay(
    api_key='bp_live_YOUR_API_KEY',
    network='mainnet'
)

transactions = client.transactions.list(
    limit=20,
    offset=0,
    status='completed'
)

print(transactions.data)
# Output: [{ 'id': 'txn_xxx', 'amount': 100, ... }]`,

    php: `<?php
require 'vendor/autoload.php';

use BettaPay\\Client;

$client = new Client([
    'api_key' => 'bp_live_YOUR_API_KEY',
    'network' => 'mainnet'
]);

$transactions = $client->transactions->list([
    'limit' => 20,
    'offset' => 0,
    'status' => 'completed'
]);

print_r($transactions->data);
// Output: Array { [0] => { 'id' => 'txn_xxx', ... } }`,

    go: `package main

import (
	"fmt"
	"github.com/bettapay/sdk-go"
)

func main() {
	client := bettapay.NewClient(
		bettapay.WithAPIKey("bp_live_YOUR_API_KEY"),
		bettapay.WithNetwork("mainnet"),
	)

	transactions, err := client.Transactions.List(ctx, &bettapay.ListTransactionsRequest{
		Limit:  20,
		Offset: 0,
		Status: "completed",
	})

	if err != nil {
		panic(err)
	}

	fmt.Println(transactions.Data)
	// Output: [{ Id: "txn_xxx", Amount: 100, ... }]
}`,
  },

  'initiate-settlement': {
    javascript: `import { BettaPay } from '@bettapay/sdk';

const client = new BettaPay({
  apiKey: 'bp_live_YOUR_API_KEY',
  network: 'mainnet',
});

const settlement = await client.settlements.initiate({
  destination: 'G1234567890ABCDEF...',
  amount: 1000,
  currency: 'USDC',
});

console.log(settlement.id);
// Output: settlement_xxx`,

    python: `from bettapay import BettaPay

client = BettaPay(
    api_key='bp_live_YOUR_API_KEY',
    network='mainnet'
)

settlement = client.settlements.initiate(
    destination='G1234567890ABCDEF...',
    amount=1000,
    currency='USDC'
)

print(settlement.id)
# Output: settlement_xxx`,

    php: `<?php
require 'vendor/autoload.php';

use BettaPay\\Client;

$client = new Client([
    'api_key' => 'bp_live_YOUR_API_KEY',
    'network' => 'mainnet'
]);

$settlement = $client->settlements->initiate([
    'destination' => 'G1234567890ABCDEF...',
    'amount' => 1000,
    'currency' => 'USDC'
]);

echo $settlement->id;
// Output: settlement_xxx`,

    go: `package main

import (
	"fmt"
	"github.com/bettapay/sdk-go"
)

func main() {
	client := bettapay.NewClient(
		bettapay.WithAPIKey("bp_live_YOUR_API_KEY"),
		bettapay.WithNetwork("mainnet"),
	)

	settlement, err := client.Settlements.Initiate(ctx, &bettapay.InitiateSettlementRequest{
		Destination: "G1234567890ABCDEF...",
		Amount:      1000,
		Currency:    "USDC",
	})

	if err != nil {
		panic(err)
	}

	fmt.Println(settlement.ID)
	// Output: settlement_xxx
}`,
  },
};
