export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Méthode non autorisée"
    });
  }

  const siren = String(req.query.siren || "").replace(/\D/g, "");

  if (!/^\d{9}$/.test(siren)) {
    return res.status(400).json({
      error: "Le SIREN doit contenir exactement 9 chiffres."
    });
  }

  const apiKey = process.env.INSEE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "La clé API Insee n'est pas configurée sur le serveur."
    });
  }

  const url =
    `https://api.insee.fr/api-sirene/3.11/siren/${siren}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "X-INSEE-Api-Key-Integration": apiKey
      }
    });

    if (response.status === 404) {
      return res.status(404).json({
        error: "SIREN introuvable."
      });
    }

    if (!response.ok) {
      const text = await response.text();

      return res.status(response.status).json({
        error: "Erreur API Sirene",
        details: text
      });
    }

    const data = await response.json();
    const unite = data.uniteLegale;

    if (!unite) {
      return res.status(404).json({
        error: "Unité légale introuvable."
      });
    }

    /*
     * En 2026 :
     * activitePrincipaleNAF25UniteLegale contient le futur code APE NAF 2025.
     *
     * À partir de 2027, l'Insee supprimera cette variable et
     * activitePrincipaleUniteLegale deviendra directement le code NAF 2025.
     */

    const code =
      unite.activitePrincipaleNAF25UniteLegale ||
      unite.activitePrincipaleUniteLegale ||
      "";

    const denomination =
      unite.denominationUniteLegale ||
      [
        unite.nomUniteLegale,
        unite.prenom1UniteLegale
      ]
        .filter(Boolean)
        .join(" ");

    return res.status(200).json({
      siren,
      denomination,
      code,
      label: "",
      status: code ? "OK" : "Code APE non disponible"
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Impossible de contacter l'API Sirene."
    });
  }
}
