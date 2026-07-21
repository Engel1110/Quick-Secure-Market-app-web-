import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import messageSecurityService from "../services/messageSecurity.service";

const EMPTY_ANALYSIS = {
  score: 0,
  riskLevel: "LOW",
  flagged: false,
  reasons: [],
  recommendation: ""
};

export default function useMessageSecurity({
  conversationId,
  text
}) {
  const [analysis, setAnalysis] =
    useState(EMPTY_ANALYSIS);

  const [
    conversationSecurity,
    setConversationSecurity
  ] = useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const timeoutRef =
    useRef(null);

  const loadConversationSecurity =
    useCallback(async () => {
      if (!conversationId) {
        setConversationSecurity(null);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const security =
          await messageSecurityService
            .getConversationSecurity(
              conversationId
            );

        setConversationSecurity(
          security
        );
      } catch (requestError) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          "No se pudo consultar el análisis de seguridad."
        );
      } finally {
        setLoading(false);
      }
    }, [
      conversationId
    ]);

  useEffect(() => {
    loadConversationSecurity();
  }, [
    loadConversationSecurity
  ]);

  useEffect(() => {
    window.clearTimeout(
      timeoutRef.current
    );

    const cleanText =
      String(text || "").trim();

    if (
      cleanText.length < 4
    ) {
      setAnalysis(
        EMPTY_ANALYSIS
      );

      return undefined;
    }

    timeoutRef.current =
      window.setTimeout(
        async () => {
          try {
            const result =
              await messageSecurityService
                .analyzeText(
                  cleanText
                );

            setAnalysis({
              ...EMPTY_ANALYSIS,
              ...result
            });
          } catch {
            /*
             * El análisis preventivo no debe
             * impedir escribir o enviar.
             */
          }
        },
        450
      );

    return () => {
      window.clearTimeout(
        timeoutRef.current
      );
    };
  }, [
    text
  ]);

  const reportMessage =
    async (
      message,
      reason
    ) => {
      const messageId =
        message?._id ||
        message?.id;

      if (!messageId) {
        throw new Error(
          "Mensaje inválido."
        );
      }

      const result =
        await messageSecurityService
          .reportMessage(
            messageId,
            reason
          );

      await loadConversationSecurity();

      return result;
    };

  return {
    analysis,
    conversationSecurity,
    loading,
    error,
    loadConversationSecurity,
    reportMessage
  };
}
