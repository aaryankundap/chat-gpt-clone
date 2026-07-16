"use client";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { UserButton } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {

 const {data , isLoading , error} = useQuery({
  queryKey:["data"],
  queryFn:async()=>{
    const res = await fetch("https://jsonplaceholder.typicode.com/todos");
    const data = await res.json();
    return data
  }
 })

 
  if(isLoading){
    return <h1>Loading...</h1>
  }

  if(error){
    return <h1>Something went wrong</h1>
  }

  return (
   <div>
   {JSON.stringify(data)}
   </div>
  );
}