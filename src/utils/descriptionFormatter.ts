import { PropertyListing, BrokerProfile } from "../types";
import { formatCurrency } from "../data/manaustowns";
import { translateAmenitiesList } from "./amenitiesTranslator";

export interface FormattedSection {
  title?: string;
  emoji?: string;
  paragraphs: string[];
  bullets?: string[];
}

/**
 * Robustly sanitizes corrupted emojis, question-mark artifacts,
 * glued markdown words and punctuation.
 */
export function sanitizeDescription(raw: string): string {
  if (!raw || typeof raw !== "string" || !raw.trim()) return "";

  let text = String(raw)
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[\uFFFD\u00A0]/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Fix words glued due to missing newlines in CRM export:
  // e.g. "HILLUma casa" -> "HILL\n\nUma casa"
  text = text.replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1\n\n$2");
  // e.g. "carrosUm imóvel" -> "carros.\n\nUm imóvel"
  text = text.replace(/([a-záàâãéèêíïóôõöúç]{2,})([A-Z][a-z]{2,})/g, "$1.\n\n$2");

  // Protect legitimate Portuguese question phrases:
  // e.g. "Gostou?", "Quer conhecer?", "por que demorei tanto?", "Tem interesse?"
  text = text.replace(
    /\b(gostou|quer conhecer|tem interesse|quer saber|conhecer|tanto|duvida|duvidas|agendar|visita|im[oó]vel)\s*\?/gi,
    "$1__REAL_Q__"
  );

  // Separate bold headers cleanly
  text = text.replace(/\?*\s*(\*\*[^*]+\*\*)\s*\?*/g, "\n\n$1\n\n");
  text = text.replace(/(\*\*[^*]+\*\*)\s*([A-ZÀ-Úa-z0-9])/g, "$1\n\n$2");
  text = text.replace(/([A-ZÀ-Úa-z0-9])\s*(\*\*[A-ZÀ-Ú0-9])/g, "$1\n\n$2");

  // Corrupted question marks used as bullets or separators
  text = text.replace(/\?+\s*([A-ZÀ-Ú0-9])/g, "\n• $1");
  text = text.replace(/([a-záàâãéèêíïóôõöúç0-9])\s*\?+\s*/gi, "$1\n• ");

  // Remove any remaining stray ?
  text = text.replace(/\?+/g, " ");

  // Restore real questions
  text = text.replace(/__REAL_Q__/g, "?");

  return text.trim();
}

/**
 * Parses raw unformatted property description strings into structured, readable sections
 * with real-estate emojis and clean spacing.
 */
export function parsePropertyDescription(rawDescription: string): FormattedSection[] {
  const cleaned = sanitizeDescription(rawDescription);
  if (!cleaned) {
    return [
      {
        title: "Descrição do Imóvel",
        emoji: "📋",
        paragraphs: ["Imóvel cadastrado com todas as especificações técnicas oficiais."],
      },
    ];
  }

  const rawLines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections: FormattedSection[] = [];
  let currentSection: FormattedSection = {
    title: "Apresentação do Imóvel",
    emoji: "✨",
    paragraphs: [],
    bullets: [],
  };

  for (const line of rawLines) {
    // Check if line is a bold title like "**APARTAMENTO À VENDA**" or "**Detalhes do imóvel:**"
    const boldMatch = line.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      const headerText = boldMatch[1].trim().replace(/[:]+$/, "");
      let emoji = "📋";
      if (/detalhe|caracter[ií]stica|especifica/i.test(headerText)) emoji = "📐";
      else if (/facilidade|financiamento|condi[cç][aã]o|pagamento|recurso|fgts/i.test(headerText)) emoji = "💳";
      else if (/valor|pre[cç]o|aluguel|venda/i.test(headerText)) emoji = "💰";
      else if (/local|endere[cç]o|bairro|estrada|rua|avenida/i.test(headerText)) emoji = "📍";
      else if (/contato|agende|corretor|corretora|visita|gostou/i.test(headerText)) emoji = "📲";
      else if (/apartamento|casa|im[oó]vel|condom[ií]nio|duplex|cobertura|lote/i.test(headerText)) emoji = "🏢";

      if (currentSection.paragraphs.length > 0 || (currentSection.bullets && currentSection.bullets.length > 0)) {
        sections.push(currentSection);
      }
      currentSection = {
        title: headerText,
        emoji,
        paragraphs: [],
        bullets: [],
      };
      continue;
    }

    // Bullet points
    if (line.startsWith("• ") || line.startsWith("- ") || line.startsWith("* ")) {
      const bulletText = line
        .replace(/^[•\-*]\s*/, "")
        .replace(/^\*\*/, "")
        .replace(/\*\*$/, "")
        .trim();
      if (bulletText && bulletText.length > 1) {
        if (!currentSection.bullets) currentSection.bullets = [];
        currentSection.bullets.push(bulletText);
      }
    } else {
      // Paragraph lines
      const cleanPara = line.replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
      if (cleanPara && cleanPara.length > 1) {
        currentSection.paragraphs.push(cleanPara);
      }
    }
  }

  if (currentSection.paragraphs.length > 0 || (currentSection.bullets && currentSection.bullets.length > 0)) {
    sections.push(currentSection);
  }

  return sections.length > 0
    ? sections
    : [
        {
          title: "Descrição do Imóvel",
          emoji: "📋",
          paragraphs: [cleaned],
        },
      ];
}

/**
 * Returns an ultra-polished WhatsApp-ready presentation pitch for a property.
 */
export function generateWhatsAppPitch(
  property: PropertyListing,
  brokerProfile?: BrokerProfile
): string {
  const isRent = property.modalidade === "Locação";
  const modalidadeText = isRent ? "LOCAÇÃO" : "VENDA";
  const area = property.livingArea || property.lotArea;
  const amenities = translateAmenitiesList(property.features || []).slice(0, 8);

  let pitch = `✨ *LOPES MANAUS • ${property.propertyCategory.toUpperCase()} PARA ${modalidadeText}*\n`;
  pitch += `📍 *${property.location.neighborhood}* (${property.location.zone}), Manaus/AM\n`;
  pitch += `🏷️ *Cód:* ${property.id}\n\n`;

  pitch += `💰 *${isRent ? "Aluguel Mensal" : "Valor de Venda"}:* ${formatCurrency(property.price)}${isRent ? "/mês" : ""}\n`;
  if (property.condoFee > 0) {
    pitch += `🏢 *Condomínio:* ${formatCurrency(property.condoFee)}/mês\n`;
  }
  if (property.yearlyTax > 0) {
    pitch += `🏛️ *IPTU:* ${formatCurrency(property.yearlyTax)}/ano\n`;
  }

  pitch += `\n📐 *FICHA TÉCNICA:*\n`;
  if (area > 0) pitch += `▫️ *Área Privativa:* ${area} m²\n`;
  if (property.bedrooms > 0) {
    pitch += `▫️ *Dormitórios:* ${property.bedrooms} quartos${property.suites > 0 ? ` (${property.suites} suíte${property.suites > 1 ? "s" : ""})` : ""}\n`;
  }
  if (property.bathrooms > 0) pitch += `▫️ *Banheiros:* ${property.bathrooms} banheiros\n`;
  if (property.garage > 0) pitch += `▫️ *Vagas de Garagem:* ${property.garage} vaga${property.garage > 1 ? "s" : ""}\n`;

  if (amenities.length > 0) {
    pitch += `\n🌟 *DIFERENCIAIS & LAZER:*\n`;
    amenities.forEach((amenity) => {
      pitch += `✔️ ${amenity}\n`;
    });
  }

  // Add clean short summary from description if available
  const parsed = parsePropertyDescription(property.description || "");
  const firstPara = parsed[0]?.paragraphs?.[0];
  if (firstPara && firstPara.length > 20 && !firstPara.includes("Descrição não informada")) {
    const cleanPara = firstPara.slice(0, 240) + (firstPara.length > 240 ? "..." : "");
    pitch += `\n📝 *Sobre o Imóvel:*\n_${cleanPara}_\n`;
  }

  if (brokerProfile) {
    pitch += `\n📲 *Agende sua visita com o consultor:*\n`;
    pitch += `👤 *${brokerProfile.name}*${brokerProfile.creci ? ` (CRECI ${brokerProfile.creci})` : ""}\n`;
    pitch += `📞 *WhatsApp:* ${brokerProfile.phone}\n`;
  }

  return pitch.trim();
}

/**
 * Returns structured presentation items for the PDF catalog card
 * formatted like an executive WhatsApp pitch.
 */
export function generatePdfSummary(property: PropertyListing): {
  headline: string;
  specs: { label: string; value: string; icon: string }[];
  highlights: string[];
  cleanDescription: string;
} {
  const isRent = property.modalidade === "Locação";
  const area = property.livingArea || property.lotArea;
  const amenities = translateAmenitiesList(property.features || []).slice(0, 6);

  const specs: { label: string; value: string; icon: string }[] = [];
  if (area > 0) specs.push({ label: "Área", value: `${area} m²`, icon: "📐" });
  if (property.bedrooms > 0) {
    specs.push({
      label: "Quartos",
      value: `${property.bedrooms}${property.suites > 0 ? ` (${property.suites}s)` : ""}`,
      icon: "🛏️",
    });
  }
  if (property.bathrooms > 0) specs.push({ label: "Banh.", value: `${property.bathrooms}`, icon: "🚿" });
  if (property.garage > 0) specs.push({ label: "Vagas", value: `${property.garage}`, icon: "🚗" });

  const parsed = parsePropertyDescription(property.description || "");
  let cleanDesc = parsed[0]?.paragraphs?.slice(0, 2).join(" ") || "";
  if (!cleanDesc || cleanDesc.length < 15) {
    cleanDesc = `Excelente oportunidade de ${isRent ? "locação" : "investimento"} no bairro ${property.location.neighborhood}. Imóvel com padrão de qualidade Lopes Manaus.`;
  }

  return {
    headline: `${property.propertyCategory} para ${property.modalidade} em ${property.location.neighborhood}`,
    specs,
    highlights: amenities,
    cleanDescription: cleanDesc,
  };
}

export function formatDescriptionForShare(rawDescription: string): string {
  if (!rawDescription) return "";
  const sections = parsePropertyDescription(rawDescription);

  const lines: string[] = [];
  sections.forEach((sec) => {
    if (sec.title) {
      lines.push(`${sec.emoji || "📋"} *${sec.title.toUpperCase()}*`);
    }
    if (sec.paragraphs) {
      sec.paragraphs.forEach((p) => lines.push(p));
    }
    if (sec.bullets && sec.bullets.length > 0) {
      sec.bullets.forEach((b) => lines.push(`▫️ ${b}`));
    }
    lines.push("");
  });

  return lines.join("\n").trim();
}
