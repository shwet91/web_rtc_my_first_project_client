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
  const [isBtnClicked, setIsBtnClicked] = useState(false);

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

    const stream = await navigator.mediaDevices.getUserMedia(
      mediaStreamOptions
    );
    if (localVid.current) localVid.current.srcObject = stream;
    setStream(stream);
  }, []);

  const btnHandler = () => {
    if (isBtnClicked) return;
    setIsBtnClicked(true);
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
    <div className="w-screen h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">Video Chat</h1>
        </div>
        {remoteName && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/30">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-green-400 text-sm font-medium">
              Connected to {remoteName}
            </span>
          </div>
        )}
      </header>

      {/* Main Video Area */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center p-4 gap-4 overflow-hidden">
        {/* Local Video */}
        <div className="relative flex-1 w-full md:w-auto h-full min-h-[200px] bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
          <video
            ref={localVid}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          ></video>
          <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg">
            <span className="text-white text-sm font-medium">You</span>
          </div>
        </div>

        {/* Remote Video */}
        <div className="relative flex-1 w-full md:w-auto h-full min-h-[200px] bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
          <video
            ref={remoteVid}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          ></video>
          {!remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
              <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                <svg
                  className="w-12 h-12 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <p className="text-slate-400 text-lg">
                Waiting for participant...
              </p>
            </div>
          )}
          {remoteName && (
            <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg">
              <span className="text-white text-sm font-medium">
                {remoteName}
              </span>
            </div>
          )}
        </div>
      </main>

      {/* Notification Banner */}
      {isRemoteBtnClicked && !isBtnClicked && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-6 py-3 bg-amber-500/20 backdrop-blur-sm border border-amber-500/50 rounded-xl shadow-lg animate-bounce">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p className="text-amber-200 font-medium">
              The other participant is ready! Click Start Call to begin.
            </p>
          </div>
        </div>
      )}

      {/* Control Bar */}
      <footer className="flex items-center justify-center gap-4 px-6 py-5 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700">
        <button
          onClick={btnHandler}
          disabled={isBtnClicked}
          className={`flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-white transition-all duration-300 shadow-lg ${
            isBtnClicked
              ? "bg-green-600 cursor-default"
              : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-blue-500/25 hover:shadow-xl hover:scale-105"
          }`}
        >
          {isBtnClicked ? (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Call Started
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Start Call
            </>
          )}
        </button>

        <button
          onClick={() => console.log(remoteName)}
          className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all duration-300"
          title="Debug: Check remote name"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </footer>
    </div>
  );
}

export default page;
