import type { Invoice, Company } from "@shared/schema";
import { db } from "./db";
import { invoices } from "@shared/schema";
import { eq } from "drizzle-orm";

const KSEF_API_URL_PROD = "https://ksef.mf.gov.pl/api";
const KSEF_API_URL_TEST = "https://ksef-test.mf.gov.pl/api";

function getKSeFApiUrl(): string {
  return process.env.KSEF_ENVIRONMENT === "production" ? KSEF_API_URL_PROD : KSEF_API_URL_TEST;
}

function isKSeFConfigured(): boolean {
  return !!(process.env.KSEF_TOKEN && process.env.KSEF_NIP);
}

function generateFakturaXML(invoice: Invoice, company: Company, items: Array<{ amount: number; description: string | null }>): string {
  const issueDate = new Date().toISOString().split("T")[0];
  const periodStart = new Date(invoice.periodStart).toISOString().split("T")[0];
  const periodEnd = new Date(invoice.periodEnd).toISOString().split("T")[0];
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : issueDate;

  const sellerNip = process.env.KSEF_NIP || "0000000000";
  const sellerName = process.env.KSEF_SELLER_NAME || "TaxiQ Sp. z o.o.";
  const sellerAddress = process.env.KSEF_SELLER_ADDRESS || "ul. Przykładowa 1, 00-001 Warszawa";

  const buyerNip = company.taxId || "";
  const buyerName = company.name || "";
  const buyerAddress = company.address || "";

  const netAmount = invoice.totalAmount;
  const vatRate = 23;
  const vatAmount = Math.round(netAmount * vatRate / 100 * 100) / 100;
  const grossAmount = Math.round((netAmount + vatAmount) * 100) / 100;

  const itemsXml = items.map((item, index) => {
    const itemNet = item.amount;
    const itemVat = Math.round(itemNet * vatRate / 100 * 100) / 100;
    const itemGross = Math.round((itemNet + itemVat) * 100) / 100;
    return `
      <FaWiersz>
        <NrWierszaFa>${index + 1}</NrWierszaFa>
        <P_7>${item.description || `Usługa transportowa`}</P_7>
        <P_8A>szt.</P_8A>
        <P_8B>1</P_8B>
        <P_9A>${itemNet.toFixed(2)}</P_9A>
        <P_11>${itemNet.toFixed(2)}</P_11>
        <P_11A>${itemNet.toFixed(2)}</P_11A>
        <P_12>23</P_12>
      </FaWiersz>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/">
  <Naglowek>
    <KodFormularza kodSystemowy="FA (2)" wersjaSchemy="1-0E">FA</KodFormularza>
    <WariantFormularza>2</WariantFormularza>
    <DataWytworzeniaFa>${new Date().toISOString()}</DataWytworzeniaFa>
    <SystemInfo>TaxiQ</SystemInfo>
  </Naglowek>
  <Podmiot1>
    <DaneIdentyfikacyjne>
      <NIP>${sellerNip}</NIP>
      <Nazwa>${escapeXml(sellerName)}</Nazwa>
    </DaneIdentyfikacyjne>
    <Adres>
      <KodKraju>PL</KodKraju>
      <AdresL1>${escapeXml(sellerAddress)}</AdresL1>
    </Adres>
  </Podmiot1>
  <Podmiot2>
    <DaneIdentyfikacyjne>
      ${buyerNip ? `<NIP>${buyerNip}</NIP>` : ""}
      <Nazwa>${escapeXml(buyerName)}</Nazwa>
    </DaneIdentyfikacyjne>
    <Adres>
      <KodKraju>PL</KodKraju>
      <AdresL1>${escapeXml(buyerAddress)}</AdresL1>
    </Adres>
  </Podmiot2>
  <Fa>
    <KodWaluty>PLN</KodWaluty>
    <P_1>${issueDate}</P_1>
    <P_2>${invoice.invoiceNumber}</P_2>
    <P_6>${dueDate}</P_6>
    <P_13_1>${netAmount.toFixed(2)}</P_13_1>
    <P_14_1>${vatAmount.toFixed(2)}</P_14_1>
    <P_14_1W>23</P_14_1W>
    <P_15>${grossAmount.toFixed(2)}</P_15>
    <Adnotacje>
      <P_16>2</P_16>
      <P_17>2</P_17>
      <P_18>2</P_18>
      <P_18A>2</P_18A>
      <Zwolnienie>
        <P_19N>1</P_19N>
      </Zwolnienie>
      <NoweSrodkiTransportu>
        <P_22N>1</P_22N>
      </NoweSrodkiTransportu>
      <P_23>2</P_23>
      <PMarzy>
        <P_PMarzyN>1</P_PMarzyN>
      </PMarzy>
    </Adnotacje>
    <RodzajFaktury>VAT</RodzajFaktury>${itemsXml}
  </Fa>
</Faktura>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function submitToKSeF(invoice: Invoice, company: Company): Promise<{ success: boolean; ksefNumber?: string; error?: string }> {
  if (!isKSeFConfigured()) {
    console.log(`[KSeF] Not configured - skipping submission for invoice ${invoice.invoiceNumber}. Set KSEF_TOKEN and KSEF_NIP to enable.`);
    return { success: false, error: "KSeF not configured" };
  }

  try {
    const items = await getInvoiceItemAmounts(invoice.id);
    const xml = generateFakturaXML(invoice, company, items);

    console.log(`[KSeF] Submitting invoice ${invoice.invoiceNumber} to ${getKSeFApiUrl()}`);

    const sessionResponse = await fetch(`${getKSeFApiUrl()}/online/Session/InitToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        context: {
          credentials: {
            identifier: {
              type: "onip",
              identifier: process.env.KSEF_NIP,
            },
            token: process.env.KSEF_TOKEN,
          },
        },
      }),
    });

    if (!sessionResponse.ok) {
      const errBody = await sessionResponse.text();
      throw new Error(`KSeF session init failed: ${sessionResponse.status} ${errBody}`);
    }

    const sessionData = await sessionResponse.json() as any;
    const sessionToken = sessionData?.sessionToken?.token;

    if (!sessionToken) {
      throw new Error("KSeF session token not received");
    }

    const xmlBase64 = Buffer.from(xml, "utf-8").toString("base64");

    const invoiceResponse = await fetch(`${getKSeFApiUrl()}/online/Invoice/Send`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "SessionToken": sessionToken,
      },
      body: JSON.stringify({
        invoiceHash: {
          hashSHA: {
            algorithm: "SHA-256",
            encoding: "Base64",
            value: createSHA256(xml),
          },
          fileSize: Buffer.byteLength(xml, "utf-8"),
        },
        invoicePayload: {
          type: "plain",
          invoiceBody: xmlBase64,
        },
      }),
    });

    if (!invoiceResponse.ok) {
      const errBody = await invoiceResponse.text();
      throw new Error(`KSeF invoice send failed: ${invoiceResponse.status} ${errBody}`);
    }

    const invoiceData = await invoiceResponse.json() as any;
    const ksefNumber = invoiceData?.elementReferenceNumber;

    if (ksefNumber) {
      console.log(`[KSeF] Invoice ${invoice.invoiceNumber} submitted successfully. KSeF reference: ${ksefNumber}`);
    }

    await fetch(`${getKSeFApiUrl()}/online/Session/Terminate`, {
      method: "GET",
      headers: {
        "SessionToken": sessionToken,
      },
    }).catch(() => {});

    return { success: true, ksefNumber };
  } catch (err: any) {
    console.error(`[KSeF] Error submitting invoice ${invoice.invoiceNumber}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

export function generateInvoiceXML(invoice: Invoice, company: Company, items: Array<{ amount: number; description: string | null }>): string {
  return generateFakturaXML(invoice, company, items);
}

async function getInvoiceItemAmounts(invoiceId: string): Promise<Array<{ amount: number; description: string | null }>> {
  const { invoiceItems } = await import("@shared/schema");
  const items = await db.select({
    amount: invoiceItems.amount,
    description: invoiceItems.description,
  }).from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  return items;
}

function createSHA256(data: string): string {
  const { createHash } = require("crypto");
  return createHash("sha256").update(data, "utf-8").digest("base64");
}
