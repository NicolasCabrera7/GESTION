import { ApiResponseData } from "../definitions"

export default async function concicliarCheque(
  chequeId:string
){
  try{
    const response = await fetch(`/api/cheque/${chequeId}/conciliar`, {
      method: "POST",
      headers:{
        "Content-Type": "application/json",
      },
    })

    const data:ApiResponseData = await response.json()
    return data
  
  }catch(error){
    if(error instanceof Error) return error.message
  }
}