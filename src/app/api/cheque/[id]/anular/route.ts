import { NextRequest } from "next/server";
import { estadoCheque } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  generateApiErrorResponse,
  generateApiSuccessResponse,
} from "@/lib/apiResponse";
import reflejarOperacion from "@/lib/operacion/reflejarOperacion";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const {bancoAfectadoId} : {bancoAfectadoId: string} = await req.json();

  const cheque = await prisma.cheque.update({
    where: {
      id:id,
      estado: estadoCheque.EMITIDO,
      bancoChequeId:{
        not:bancoAfectadoId
      },
      esRecibido:true
    },
    data:{
      estado: estadoCheque.ANULADO
    },
    include:{
      cuentaAfectada:{
        include:{
          entidad:true
        }
      },
      bancoCheque:true
    }
  })

  if (!cheque)
    return generateApiErrorResponse("Cheque no encontrado", 404);

  const tipoOperacionId = await prisma.tipoOperacion.findUnique({
    where: {
      nombre: "ANULACION DE CHEQUE"
    },
    select:{
      id: true
    }
  })

  if(!tipoOperacionId) return generateApiErrorResponse("Tipo de operacion para anulacion de cheque no encontrada", 404)
  
  const operacion = await prisma.operacion.create({
    data: {
      bancoInvolucrado: cheque.bancoCheque.nombre,
      nombreInvolucrado: cheque.cuentaAfectada.entidad.nombre,
      rucInvolucrado: cheque.cuentaAfectada.entidad.ruc,
      cuentaInvolucrado: cheque.cuentaAfectada.numeroCuenta,
      concepto: "ANULACION DE CHEQUE",
      fechaOperacion: new Date(),
      cuentaBancariaOrigenId: cheque.cuentaBancariaAfectadaId,
      monto: cheque.monto,
      tipoOperacionId: tipoOperacionId.id,
      numeroComprobante: cheque.numeroCheque,
    },
    include: {
      tipoOperacion: {
        select: {
          esDebito: true,
          afectaSaldo: true,
        }
      },
    }
  })

  await reflejarOperacion(operacion.cuentaBancariaOrigenId, Number(operacion.monto), operacion.tipoOperacion.esDebito, operacion.tipoOperacion.afectaSaldo)

  if(!operacion) return generateApiErrorResponse("Error creando la operacion para anular el cheque", 404)

  return generateApiSuccessResponse(
    200,
    `Cheque n° ${cheque.numeroCheque} fue anulado`,
    cheque
  );
}
