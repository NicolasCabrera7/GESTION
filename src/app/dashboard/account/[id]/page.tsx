"use client";
import obtenerCuentaBancariaPorId from "@/lib/cuentaBancaria/obtenerCuentaBancariaPorId";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DetalleCuentasReceipt from "../../../../components/PDF/DetalleCuentas";
import obtenerOperacionesFiltros from "@/lib/operacion/obtenerOperacionesFiltros";
import { ApiResponseData, OperacionAndTipoOperacion } from "@/lib/definitions";
import obtenerTiposOperacion from "@/lib/tipoOperacion/obtenerTiposOperacion";
import { CuentaBancaria } from "@prisma/client";
import Link from "next/link";
import {
  WalletIcon,
  BanknotesIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { PDFDownloadLink } from "@react-pdf/renderer";
export default function AccountDetailsTab() {
  const quantityPerPage = parseInt(process.env.QUANTITY_PER_PAGE || "4");
  const [indicesPagina, setindicesPagina] = useState(0);
  const [indiceActual, setIndiceActual] = useState(0);
  const [accountData, setAccountData] = useState<CuentaBancaria | null>(null);
  const [operaciones, setOperaciones] = useState<OperacionAndTipoOperacion[]>(
    []
  );
  const [operacionesFiltradas, setOperacionesFiltradas] = useState<
    OperacionAndTipoOperacion[]
  >([]);
  const [tipoOperaciones, setTipoOperaciones] = useState<
    ApiResponseData<
      {
        id: string;
        nombre: string;
        esDebito: boolean;
        afectaSaldo: boolean;
        deleted: Date | null;
      }[]
    >
  >();

  const [filtros, setFiltros] = useState({
    tipoOperacionId: "Todas",
    fechaMin: "",
    fechaMax: "",
    banco:"",
    esDebito: false,
    pagina: 0,
  });

  const { id } = useParams();
  const router = useRouter();
  const handleNavigation = (path: string) => {
    return () => {
      router.push(path);
    };
  };

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const cuentaReq = await obtenerCuentaBancariaPorId(id as string);
        if (!cuentaReq || typeof cuentaReq === "string") {
          throw new Error("Error obteniendo la cuenta");
        }
        setAccountData(cuentaReq.data);
      } catch (error) {
        console.error(error);
      }
    };

    const fetchTiposOperaciones = async () => {
      try {
        const tipoOperacionesReq = await obtenerTiposOperacion();
        if (tipoOperacionesReq === undefined) {
          throw new Error("Error obteniendo las operaciones");
        }
        if (typeof tipoOperacionesReq === "string" || !tipoOperacionesReq) {
          throw new Error(tipoOperacionesReq);
        }
        setTipoOperaciones(tipoOperacionesReq);
      } catch (error) {
        console.error(error);
      }
    };
    fetchAccount();
    fetchTiposOperaciones();
  }, [id]);

  const fetchOperaciones = useCallback(async () => {
    try {
      console.log("fetching operaciones");
      const operacionesReq = await obtenerOperacionesFiltros({
        cuentaId: id as string,
        fechaDesde: filtros.fechaMin,
        fechaHasta: filtros.fechaMax,
        skip: filtros.pagina,
        upTo: quantityPerPage,
        esDebito: filtros.esDebito,
        banco: filtros.banco,
        tipoOperacionId: filtros.tipoOperacionId,
      });

      if (typeof operacionesReq === "string") {
        throw new Error(operacionesReq);
      }

      if (!operacionesReq || !operacionesReq.data) {
        throw new Error("Error obteniendo las operaciones");
      }

      setOperaciones(operacionesReq.data.values);
      setOperacionesFiltradas(operacionesReq.data.values);
      setindicesPagina(
        operacionesReq.data.totalQuantity % quantityPerPage === 0
          ? operacionesReq.data.totalQuantity / quantityPerPage
          : Math.floor(operacionesReq.data.totalQuantity / quantityPerPage) + 1
      );
    } catch (error) {
      console.error(error);
    }
  }, [id, filtros, quantityPerPage]);

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const formattedDate = `${day < 10 ? "0" + day : day}-${
      month < 10 ? "0" + month : month
    }-${year}`;
    return formattedDate;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setFiltros({
      ...filtros,
      [name]: value,
    });
  };

  const changeIndicePagina = async (indice: number) => {
    setIndiceActual(indice);
    setFiltros({
      ...filtros,
      pagina: indice * quantityPerPage,
    });
  };

  useEffect(() => {
    fetchOperaciones();
  }, [fetchOperaciones]);

  if (accountData === null || operaciones === null) {
    return <h1>cargando....</h1>;
  } else {
    return (
      <div className="flex flex-col h-full -mt-8">
        {/* Encabezado con título y botón de retroceso */}
        <div className="flex justify-between items-center bg-primary-800 p-4 rounded-md">
          <h1 className="text-2xl font-bold mt-2 mb-2">Detalle cuentas</h1>
          <div>
            <Link
              className="px-4 py-2 bg-gray-800 rounded-md hover:bg-gray-900 mr-4"
              href={`/dashboard/account/${id}/cheque`}
            >
              Ver Cheques
            </Link>
            <PDFDownloadLink
              className="mr-4 bg-gray-800 hover:bg-gray-900 text-white py-2 px-4 rounded-md"
              document={
                <DetalleCuentasReceipt
                  operaciones={operaciones}
                  cuenta={accountData}
                  //concepto={concepto}
                />
              }
              fileName="detalle-cuentas.pdf"
            >
              {({ loading, url, error, blob }) =>
                loading ? (
                  <button> Cargando documento... </button>
                ) : (
                  <button>Descargar</button>
                )
              }
            </PDFDownloadLink>
            <Link
              href="/dashboard/account"
              className="bg-gray-800 hover:bg-gray-900 text-white  py-2 px-4 rounded"
            >
              Atrás
            </Link>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="bg-gray-800 rounded-md  py-5 mt-2 flex gap-2 justify-around flex-wrap">
          <div className="w-20 h-20 mt-2">
            {accountData.esCuentaAhorro ? (
              <BanknotesIcon className="text-primary-400" />
            ) : (
              <WalletIcon className="text-primary-400" />
            )}
          </div>
          <div className="mt-5">
            <div className="mb-4 flex items-center">
              <label className="block  font-semibold mr-2">
                Tipo de Cuenta:
              </label>
              <p>
                {accountData.esCuentaAhorro
                  ? "Cuenta de ahorros"
                  : "Cuenta Corriente"}
              </p>
            </div>
            <div className="mb-4 flex items-center">
              <label className="block font-semibold mr-2">
                Numero de Cuenta:
              </label>
              <p>{accountData.numeroCuenta}</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-4 flex items-center">
              <label className="block font-semibold mr-2">Saldo Total:</label>
              <p>${Number(accountData.saldo).toLocaleString()}</p>
            </div>
            <div className="flex items-center">
              <label className="block font-semibold mr-2">
                Saldo Disponible:
              </label>
              <p>${Number(accountData.saldoDisponible).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <h1 className="text-xl font-bold my-4">Movimientos</h1>

        <div className="flex justify-around gap-3 mb-1 bg-primary-800 p-4 rounded-md">
          <div>
            <label>Tipo Operacion</label>
            <select
              className="bg-gray-800 text-white py-1 px-2 rounded-md ml-3 mr-3"
              name="tipoOperacion"
              onChange={handleChange}
            >
              <option value="Todas">Todas</option>
              {tipoOperaciones?.data.map((option, i) => (
                <option key={i}>{option.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Fecha minima</label>
            <input
              type="date"
              name="fechaMin"
              value={filtros.fechaMin}
              onChange={handleChange}
              className="bg-gray-800 text-white py-1 px-2 rounded-md ml-3 mr-3"
            />
          </div>
          <div>
            <label>Fecha Maxima</label>
            <input
              type="date"
              name="fechaMax"
              value={filtros.fechaMax}
              onChange={handleChange}
              className="bg-gray-800 text-white py-1 px-2 rounded-md ml-3 mr-3"
            />
          </div>
        </div>

        <div className="flex-grow bg-gray-800 rounded-md p-5 flex flex-row">
          <table className="border-collapse w-full">
            <tbody>
              <tr>
                <td className="w-1/6">
                  <span className="text-md mt-1 text-primary-400">
                    Operacion
                  </span>
                </td>
                <td className="w-1/6">
                  <span className="text-md mt-1 text-primary-400">Fecha</span>
                </td>
                <td className="w-1/6">
                  <span className="text-md mt-1 text-primary-400">
                    Banco Involucrado
                  </span>
                </td>
                <td className="w-1/6">
                  <span className="text-md mt-1 text-primary-400">
                    Involucrado
                  </span>
                </td>
                <td className="w-1/6">
                  <span className="text-md mt-1 text-primary-400">
                    Concepto
                  </span>
                </td>
                <td className="w-1/6">
                  <span className="text-md mt-1 text-primary-400">Monto</span>
                </td>
              </tr>
              {operacionesFiltradas.map((operacion, index) => (
                <tr
                  key={index}
                  onClick={handleNavigation(
                    `/dashboard/account/${id}/${operacion.id}`
                  )}
                  className="border-b-2 border-b-gray-700 w-full hover:bg-gray-700 hover:cursor-pointer"
                  title="Ver detalles de la operación"
                >
                  <td className="py-2">
                    <div className="w-7 h-7 ml-5">
                      {operacion.tipoOperacion.esDebito ? (
                        <ArrowUpRightIcon className="text-red-500" />
                      ) : (
                        <ArrowDownLeftIcon className="text-green-500" />
                      )}
                    </div>
                  </td>
                  <td>
                    <h1 className="text-sm font-normal mt-1">
                      {formatDate(operacion.fechaOperacion)}
                    </h1>
                  </td>
                  <td>
                    <h1 className="text-sm font-normal mt-1">
                      {operacion.bancoInvolucrado}
                    </h1>
                  </td>
                  <td>
                    <h1 className="text-sm font-normal mt-1 ">
                      {operacion.nombreInvolucrado}
                    </h1>
                  </td>
                  <td>
                    <h1 className="text-sm font-normal mt-1 ">
                      {operacion.concepto}
                    </h1>
                  </td>
                  <td>
                    <span
                      className={`text-sm mt-1 ${
                        operacion.tipoOperacion.esDebito
                          ? "text-red-500"
                          : "text-green-500"
                      }`}
                    >
                      {operacion.tipoOperacion.esDebito
                        ? `- ${Number(operacion.monto).toLocaleString()} Gs.`
                        : `+ ${Number(operacion.monto).toLocaleString()} Gs.`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-around items-center mt-2 ">
          <button
            onClick={async () => await changeIndicePagina(indiceActual - 1)}
            disabled={indiceActual - 1 === -1}
            className="w-8 bg-gray-700 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700 rounded"
          >
            <ChevronLeftIcon />
          </button>
          <div className="gap-2 flex">
            {[...Array(indicesPagina)].map((_, index) => (
              <button
                key={index}
                onClick={async () => await changeIndicePagina(index)}
                className={
                  (index === indiceActual
                    ? "opacity-50 cursor-not-allowed "
                    : "hover:bg-gray-900 ") + "px-6 py-2 bg-gray-700 rounded"
                }
              >
                <span className={"cursor-pointer m-auto"}>{index + 1}</span>
              </button>
            ))}
          </div>
          <button
            onClick={async () => await changeIndicePagina(indiceActual + 1)}
            disabled={indiceActual + 1 === indicesPagina}
            className={
              "w-8 bg-gray-700 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700 rounded"
            }
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    );
  }
}
