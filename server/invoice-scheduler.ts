import { storage } from "./storage";
import { db } from "./db";
import { invoices } from "@shared/schema";
import { submitToKSeF } from "./ksef-service";
import { and, gte, lte, eq } from "drizzle-orm";

export function startInvoiceScheduler() {
  console.log("[INVOICE_SCHEDULER] Started - checking hourly");

  setInterval(() => {
    checkAndGenerateMonthlyInvoices();
  }, 60 * 60 * 1000);
}

async function hasInvoiceForPeriod(companyId: string, periodStart: Date, periodEnd: Date): Promise<boolean> {
  const existing = await db.select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        eq(invoices.companyId, companyId),
        gte(invoices.periodStart, periodStart),
        lte(invoices.periodEnd, periodEnd)
      )
    )
    .limit(1);
  return existing.length > 0;
}

async function checkAndGenerateMonthlyInvoices() {
  try {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (currentDay !== 1) {
      return;
    }

    console.log(`[INVOICE_SCHEDULER] 1st of month detected - generating invoices for previous month`);

    const prevMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1, 0, 0, 0, 0);

    const allCompanies = await storage.getAllCompanies();
    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const company of allCompanies) {
      try {
        if (!company.isActive) {
          skipped++;
          continue;
        }

        const alreadyExists = await hasInvoiceForPeriod(company.id, prevMonthStart, prevMonthEnd);
        if (alreadyExists) {
          skipped++;
          continue;
        }

        const invoice = await storage.generateInvoice(
          company.id,
          prevMonthStart,
          prevMonthEnd
        );

        if (invoice) {
          generated++;
          console.log(`[INVOICE_SCHEDULER] Generated invoice ${invoice.invoiceNumber} for company "${company.name}" (${invoice.rideCount} rides, ${invoice.totalAmount} zł)`);

          try {
            await submitToKSeF(invoice, company);
            console.log(`[INVOICE_SCHEDULER] KSeF submission initiated for invoice ${invoice.invoiceNumber}`);
          } catch (ksefErr: any) {
            console.error(`[INVOICE_SCHEDULER] KSeF submission failed for ${invoice.invoiceNumber}: ${ksefErr.message}`);
          }
        } else {
          skipped++;
        }
      } catch (err: any) {
        errors++;
        console.error(`[INVOICE_SCHEDULER] Error generating invoice for company ${company.id}: ${err.message}`);
      }
    }

    console.log(`[INVOICE_SCHEDULER] Monthly generation complete: ${generated} generated, ${skipped} skipped, ${errors} errors`);
  } catch (err: any) {
    console.error(`[INVOICE_SCHEDULER] Fatal error: ${err.message}`);
  }
}
