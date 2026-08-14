import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend";


const RESEND_API_KEY =
  Deno.env.get("RESEND_API_KEY");

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL");

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY"
  );

const EMAIL_WEBHOOK_SECRET =
  Deno.env.get(
    "EMAIL_WEBHOOK_SECRET"
  );



type NotificationRecord = {
  id: string;
  utilisateur_id: string;
  type: string;
  titre: string;
  contenu: string | null;
  lien: string | null;
};


type WebhookPayload = {
  type: "INSERT";
  table: string;
  schema: string;
  record: NotificationRecord;
  old_record: null;
};

function escapeHtml(
  texte: string
): string {

  return texte.replace(
    /[&<>"']/g,
    (caractere) => {

      const caracteres:
        Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };

      return caracteres[
        caractere
      ];
    }
  );
}

Deno.serve(async (req) => {

  try {

    if (
      !RESEND_API_KEY ||
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !EMAIL_WEBHOOK_SECRET
    ) {

      console.error(
        "Variables d'environnement manquantes",
        {
          RESEND_API_KEY:
            Boolean(
              RESEND_API_KEY
            ),

          SUPABASE_URL:
            Boolean(
              SUPABASE_URL
            ),

          SUPABASE_SERVICE_ROLE_KEY:
            Boolean(
              SUPABASE_SERVICE_ROLE_KEY
            ),

          EMAIL_WEBHOOK_SECRET:
            Boolean(
              EMAIL_WEBHOOK_SECRET
            ),
        }
      );


      return Response.json(
        {
          error:
            "Configuration serveur incomplète",
        },
        {
          status: 500,
        }
      );
    }

    const resend =
      new Resend(
        RESEND_API_KEY
      );


    const supabaseAdmin =
      createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
      );

    if (req.method !== "POST") {
      return new Response(
        "Méthode non autorisée",
        {
          status: 405,
        }
      );
    }

    const secretRecu =
      req.headers.get(
        "x-webhook-secret"
      );


    if (
      secretRecu !==
      EMAIL_WEBHOOK_SECRET
    ) {
      return new Response(
        "Non autorisé",
        {
          status: 401,
        }
      );
    }

    const payload: WebhookPayload =
      await req.json();


    const notification =
      payload.record;


    if (
      payload.type !== "INSERT" ||
      payload.table !==
      "notifications" ||
      !notification
    ) {

      return Response.json({
        ignore: true,
      });

    }

    const titreHtml =
      escapeHtml(
        notification.titre
      );


    const contenuHtml =
      notification.contenu
        ? escapeHtml(
          notification.contenu
        )
        : "";

    // --------------------------------------------
    // PRÉFÉRENCE E-MAIL DU DESTINATAIRE
    // --------------------------------------------

    const {
      data: profil,
      error: profilError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        "notifications_email_activees"
      )
      .eq(
        "id",
        notification.utilisateur_id
      )
      .single();


    if (profilError) {

      console.error(
        "Erreur profil :",
        profilError
      );

      return new Response(
        "Erreur profil",
        {
          status: 500,
        }
      );
    }


    if (
      !profil
        .notifications_email_activees
    ) {

      return Response.json({
        email_envoye: false,
        raison:
          "notifications_email_desactivees",
      });

    }


    // --------------------------------------------
    // ADRESSE E-MAIL SUPABASE AUTH
    // --------------------------------------------

    const {
      data: utilisateur,
      error: utilisateurError,
    } =
      await supabaseAdmin
        .auth
        .admin
        .getUserById(
          notification
            .utilisateur_id
        );


    if (
      utilisateurError ||
      !utilisateur.user
    ) {

      console.error(
        "Erreur utilisateur :",
        utilisateurError
      );

      return new Response(
        "Utilisateur introuvable",
        {
          status: 500,
        }
      );
    }


    const email =
      utilisateur.user.email;


    if (!email) {

      return Response.json({
        email_envoye: false,
        raison:
          "aucune_adresse_email",
      });

    }


    // --------------------------------------------
    // TYPES ENVOYÉS PAR E-MAIL
    // --------------------------------------------

    const typesEmailAutorises =
      new Set([
        "demande_recue",
        "demande_acceptee",
        "demande_refusee",
        "sortie_annulee",
        "sortie_modifiee",
      ]);


    if (
      !typesEmailAutorises.has(
        notification.type
      )
    ) {

      return Response.json({
        email_envoye: false,
        raison:
          "type_non_envoye_par_email",
      });

    }


    // --------------------------------------------
    // LIEN VERS runIN
    // --------------------------------------------

    const baseUrl =
      "https://run-in-lovat.vercel.app";


    const chemin =
      notification.lien &&
        notification.lien.startsWith("/")
        ? notification.lien
        : "/notifications";

    const lien =
      `${baseUrl}${chemin}`;


    // --------------------------------------------
    // ENVOI RESEND
    // --------------------------------------------

    const {
      data,
      error,
    } = await resend.emails.send(
      {
        from:
          "runIN <onboarding@resend.dev>",

        to: [
          email,
        ],

        subject:
          notification.titre,

        html: `
      <div
        style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.5;
        "
      >
        <h2>
          ${titreHtml}
        </h2>

        <p>
          ${contenuHtml}
        </p>

        <p>
          <a href="${lien}">
            Voir sur runIN
          </a>
        </p>

        <p
          style="
            margin-top: 32px;
            font-size: 12px;
            color: #666;
          "
        >
          Vous recevez cet e-mail
          car les notifications e-mail
          sont activées dans votre profil runIN.
        </p>
      </div>
    `,
      },
      {
        idempotencyKey:
          `notification/${notification.id}`,
      }
    );


    if (error) {

      console.error(
        "Erreur Resend :",
        error
      );

      return Response.json(
        {
          error,
        },
        {
          status: 500,
        }
      );

    }


    return Response.json({
      email_envoye: true,
      resend: data,
    });


  } catch (error) {

    console.error(
      "Erreur fonction :",
      error
    );


    return new Response(
      "Erreur interne",
      {
        status: 500,
      }
    );

  }

});