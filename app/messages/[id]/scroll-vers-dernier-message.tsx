"use client";

import {
  useEffect,
  useRef,
} from "react";


type ScrollVersDernierMessageProps = {
  dernierMessageId?: string;
};


export default function ScrollVersDernierMessage({
  dernierMessageId,
}: ScrollVersDernierMessageProps) {

  const finMessagesRef =
    useRef<HTMLDivElement>(null);


  useEffect(() => {

    finMessagesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });

  }, [dernierMessageId]);


  return (
    <div
      ref={finMessagesRef}
      aria-hidden="true"
    />
  );
}