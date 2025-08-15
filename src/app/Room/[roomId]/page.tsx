"use client";

import { usePeer } from "@/context/PeerProvider";
import { useSocket } from "@/context/SocketContext";
import React, { useCallback, useEffect, useRef, useState } from "react";

function page() {
  const { socket, callUserData } = useSocket();
  const {
    createOffer,
    createAnswer,
    setRemoteAns,
    sendStream,
    peer,
    remoteStream,
    createNegotiationAnswer,
  } = usePeer();
  const [remoteName, setRemoteName] = useState<string>("");
  const [stream, setStream] = useState<MediaStream>();
  const localVid = useRef<HTMLVideoElement>(null);
  const remoteVid = useRef<HTMLVideoElement>(null);
  const [isRemoteBtnClicked, setIsRemoteBtnCllicked] = useState(false);

  const newUserJoin = async (data: any) => {
    if (!socket) return;

    const { roomId, name } = data;
    console.log("new user joined :", name);
    setRemoteName(name);

    const offer = await createOffer();
    console.log("offer send :", offer);
    socket.emit("call-user", { name, offer });
  };

  const handleIncommingCall = useCallback(
    async (offer: any, offerSenderName: string) => {
      const answer = await createAnswer(offer);
      console.log("answer send :", answer);
      socket?.emit("call-accepted", { answer, offerSenderName });
    },
    []
  );

  const handleNegotiationIncommingCall = useCallback(async (data: any) => {
    const { offer, offerSenderName } = data;
    const answer = await createNegotiationAnswer(offer);
    console.log("Negotiation answer send :", answer);
    socket?.emit("call-accepted", { answer, offerSenderName });
  }, []);

  const handleCallAccepted = useCallback(async (data: any) => {
    const { answer } = data;
    if (!answer) return;

    console.log("answer received :", answer);
    await setRemoteAns(answer);
  }, []);

  const getUserMedia = useCallback(async () => {
    const mediaStreamOptions = {
      video: {
        width: { ideal: 1280 }, // HD quality
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 },
        aspectRatio: 16 / 9,
      },
      audio: {
        echoCancellation: true, // Reduce echo
        noiseSuppression: true, // Reduce background noise
        autoGainControl: true, // Adjust mic volume automatically
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(mediaStreamOptions);
    if (localVid.current) localVid.current.srcObject = stream;
    setStream(stream);
  }, []);

  const btnHandler = () => {
    console.log("clicked btn :", remoteName);
    setIsRemoteBtnCllicked(false);
    sendStream(stream);
    socket?.emit("start-btn-clicked", { remoteName });
  };

  const negotiationNeeded = async () => {
    console.log("value of :", remoteName);
    const offer = await createOffer();
    socket?.emit("call-user-negotiation", { name: remoteName, offer });
  };

  useEffect(() => {
    getUserMedia();
  }, []);

  useEffect(() => {
    if (callUserData) {
      console.log("received call :", callUserData);
      const { offer, offerSenderName } = callUserData;
      setRemoteName(offerSenderName);
      handleIncommingCall(offer, offerSenderName);
    }
  }, [callUserData]);

  useEffect(() => {
    peer?.addEventListener("negotiationneeded", negotiationNeeded);

    return () => {
      peer?.removeEventListener("negotiationneeded", negotiationNeeded);
    };
  }, [remoteName]);

  useEffect(() => {
    if (!socket) return;

    socket.on("joined-room", newUserJoin);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("call-user-negotiation", handleNegotiationIncommingCall);
    socket.on("start-btn-clicked", () => setIsRemoteBtnCllicked(true));

    return () => {
      socket.off("joined-room", newUserJoin);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("call-user-negotiation", handleNegotiationIncommingCall);
      socket.off("start-btn-clicked", () => setIsRemoteBtnCllicked(true));
    };
  }, []);

  useEffect(() => {
    if (!remoteVid.current || !remoteStream) return;

    console.log("this is remote stream:", remoteStream);
    remoteVid.current.srcObject = remoteStream;
  }, [remoteStream]);
  return (
    <div className="w-screen h-screen bg-yellow-800 flex items-center justify-center">
      <div className="border-black border-2 p-5">
        <h1 className="text-4xl">Welcome to video Chat</h1>
        <h1 className="text-black">connected to {remoteName}</h1>
        {isRemoteBtnClicked && (
          <h1 className="text-red-600">
            other user has clicked the start button now you have to click the
            start btn to start the call
          </h1>
        )}
        <button
          onClick={btnHandler}
          className="bg-gray-500 rounded-2xl p-3 m-3"
        >
          Start call
        </button>
        <button onClick={() => console.log(remoteName)}>
          check remote name
        </button>
        <div className="flex ">
          <div className="border-green-500 border-4 h-[50vh] mr-3">
            <video ref={localVid} autoPlay playsInline></video>
          </div>
          <div className="border-red-500 border-4 h-[50vh]">
            <video ref={remoteVid} autoPlay playsInline muted></video>
          </div>
        </div>
      </div>
    </div>
  );
}

export default page;
