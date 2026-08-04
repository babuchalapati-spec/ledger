const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

function fileToContentBlock(filePath, mimeType) {
  const data = fs.readFileSync(filePath).toString('base64');
  if (mimeType === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: mimeType, data } };
  }
  return { type: 'image', source: { type: 'base64', media_type: mimeType, data } };
}

const singleBillSchema = {
  type: 'object',
  properties: {
    billNumber: { type: 'string', description: "The invoice/bill number as printed on the document. Empty string if none is visible." },
    amount: { type: 'number', description: 'The total/grand total amount on the bill, as a plain number with no currency symbols.' },
    description: { type: 'string', description: 'A short one-line description of the bill, e.g. vendor/shop name and what it is for.' },
  },
  required: ['billNumber', 'amount', 'description'],
  additionalProperties: false,
};

async function extractSingleBill(filePath, mimeType) {
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: singleBillSchema } },
    messages: [{
      role: 'user',
      content: [
        fileToContentBlock(filePath, mimeType),
        { type: 'text', text: 'Read this bill/invoice and extract its bill number, total amount, and a short description.' },
      ],
    }],
  });
  const textBlock = response.content.find((b) => b.type === 'text');
  return JSON.parse(textBlock.text);
}

const statementSchema = {
  type: 'object',
  properties: {
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Transaction date in YYYY-MM-DD format. Infer the year from context if not printed on every line.' },
          type: { type: 'string', enum: ['bill', 'payment'], description: "'bill' for a purchase/charge that increases what the customer owes; 'payment' for money received from the customer." },
          billNumber: { type: 'string', description: 'Invoice/bill number if present, else empty string.' },
          description: { type: 'string', description: 'Short description of the line item.' },
          amount: { type: 'number', description: 'Transaction amount as a plain positive number.' },
        },
        required: ['date', 'type', 'billNumber', 'description', 'amount'],
        additionalProperties: false,
      },
    },
  },
  required: ['transactions'],
  additionalProperties: false,
};

async function extractStatement(filePath, mimeType) {
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 8000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: statementSchema } },
    messages: [{
      role: 'user',
      content: [
        fileToContentBlock(filePath, mimeType),
        { type: 'text', text: 'Read this account statement and extract every transaction as a bill (charge) or payment (money received), in the order they appear.' },
      ],
    }],
  });
  const textBlock = response.content.find((b) => b.type === 'text');
  return JSON.parse(textBlock.text).transactions;
}

module.exports = { extractSingleBill, extractStatement };
