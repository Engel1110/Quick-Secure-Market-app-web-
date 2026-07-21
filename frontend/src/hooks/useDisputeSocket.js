import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  connectSocket,
  getSocket,
  joinDisputeRoom,
  leaveDisputeRoom,
  emitDisputeTyping,
  emitDisputeStopTyping
} from "../services/socket";

export default function useDisputeSocket({
  token,
  disputeId,
  onNewMessage,
  onStatusChanged,
  onEvidenceAdded,
  onResolved,
  onAssigned
}) {
  const [connected, setConnected] =
    useState(false);

  const [typingUsers, setTypingUsers] =
    useState([]);

  const typingTimeoutRef =
    useRef(null);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket =
      connectSocket(token);

    if (!socket) {
      return undefined;
    }

    const handleConnect = () => {
      setConnected(true);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleNewMessage = (
      payload
    ) => {
      if (
        payload.disputeId !==
        disputeId
      ) {
        return;
      }

      onNewMessage?.(payload);
    };

    const handleStatusChanged = (
      payload
    ) => {
      if (
        payload.disputeId !==
        disputeId
      ) {
        return;
      }

      onStatusChanged?.(payload);
    };

    const handleEvidenceAdded = (
      payload
    ) => {
      if (
        payload.disputeId !==
        disputeId
      ) {
        return;
      }

      onEvidenceAdded?.(payload);
    };

    const handleResolved = (
      payload
    ) => {
      if (
        payload.disputeId !==
        disputeId
      ) {
        return;
      }

      onResolved?.(payload);
    };

    const handleAssigned = (
      payload
    ) => {
      if (
        payload.disputeId !==
        disputeId
      ) {
        return;
      }

      onAssigned?.(payload);
    };

    const handleTyping = (
      payload
    ) => {
      if (
        payload.disputeId !==
        disputeId
      ) {
        return;
      }

      setTypingUsers(
        (currentUsers) => {
          const exists =
            currentUsers.some(
              (user) =>
                String(
                  user._id
                ) ===
                String(
                  payload.user._id
                )
            );

          if (exists) {
            return currentUsers;
          }

          return [
            ...currentUsers,
            payload.user
          ];
        }
      );
    };

    const handleStopTyping = (
      payload
    ) => {
      if (
        payload.disputeId !==
        disputeId
      ) {
        return;
      }

      setTypingUsers(
        (currentUsers) =>
          currentUsers.filter(
            (user) =>
              String(user._id) !==
              String(
                payload.userId
              )
          )
      );
    };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "dispute:newMessage",
      handleNewMessage
    );

    socket.on(
      "dispute:statusChanged",
      handleStatusChanged
    );

    socket.on(
      "dispute:newEvidence",
      handleEvidenceAdded
    );

    socket.on(
      "dispute:resolved",
      handleResolved
    );

    socket.on(
      "dispute:assigned",
      handleAssigned
    );

    socket.on(
      "dispute:typing",
      handleTyping
    );

    socket.on(
      "dispute:stopTyping",
      handleStopTyping
    );

    setConnected(
      socket.connected
    );

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "dispute:newMessage",
        handleNewMessage
      );

      socket.off(
        "dispute:statusChanged",
        handleStatusChanged
      );

      socket.off(
        "dispute:newEvidence",
        handleEvidenceAdded
      );

      socket.off(
        "dispute:resolved",
        handleResolved
      );

      socket.off(
        "dispute:assigned",
        handleAssigned
      );

      socket.off(
        "dispute:typing",
        handleTyping
      );

      socket.off(
        "dispute:stopTyping",
        handleStopTyping
      );
    };
  }, [
    token,
    disputeId,
    onNewMessage,
    onStatusChanged,
    onEvidenceAdded,
    onResolved,
    onAssigned
  ]);

  useEffect(() => {
    if (
      !disputeId ||
      !getSocket()
    ) {
      return undefined;
    }

    joinDisputeRoom(
      disputeId
    ).then((response) => {
      if (!response.success) {
        console.error(
          "No se pudo entrar a la sala:",
          response.message
        );
      }
    });

    return () => {
      leaveDisputeRoom(
        disputeId
      );
    };
  }, [disputeId]);

  const notifyTyping = () => {
    if (!disputeId) {
      return;
    }

    emitDisputeTyping(
      disputeId
    );

    if (
      typingTimeoutRef.current
    ) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    typingTimeoutRef.current =
      setTimeout(() => {
        emitDisputeStopTyping(
          disputeId
        );
      }, 1200);
  };

  const stopTyping = () => {
    if (
      typingTimeoutRef.current
    ) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    emitDisputeStopTyping(
      disputeId
    );
  };

  return {
    connected,
    typingUsers,
    notifyTyping,
    stopTyping
  };
}