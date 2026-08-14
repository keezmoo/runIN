"use client";

import {
    MouseEvent,
    ReactNode,
    useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";


type NotificationLinkProps = {
    notificationId: string;
    href: string;
    estNonLue: boolean;
    children: ReactNode;
};


export default function NotificationLink({
    notificationId,
    href,
    estNonLue,
    children,
}: NotificationLinkProps) {

    const router = useRouter();

    const [
        chargement,
        setChargement,
    ] = useState(false);


    async function ouvrirNotification(
        event: MouseEvent<HTMLAnchorElement>
    ) {

        // Déjà lue :
        // navigation normale.
        if (!estNonLue) {
            return;
        }


        event.preventDefault();

        if (chargement) {
            return;
        }

        setChargement(true);


        const supabase =
            createClient();


        const {
            error,
        } = await supabase.rpc(
            "marquer_notification_lue",
            {
                p_notification_id:
                    notificationId,
            }
        );


        if (error) {

            console.error(
                "Erreur lecture notification :",
                error
            );

        } else {

            window.dispatchEvent(
                new Event(
                    "notifications-non-lues-modifiees"
                )
            );
        }


        router.push(href);
    }


    return (
        <Link
            href={href}
            onClick={ouvrirNotification}
            className="block hover:opacity-80"
        >
            {children}
        </Link>
    );
}