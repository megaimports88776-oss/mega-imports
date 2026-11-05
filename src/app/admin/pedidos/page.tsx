"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Ajuste o caminho se necessário

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarPedidos();
  }, []);

  async function carregarPedidos() {
    try {
      // Nota: Assumimos que a tabela se chama 'orders'. 
      // Se na sua BD tiver outro nome (ex: 'pedidos'), altere abaixo.
      const { data, error } = await supabase
        .from("orders") 
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-white">A carregar pedidos...</div>;
  }

  return (
    <div className="p-6 min-h-screen text-gray-100">
      <h1 className="text-3xl font-bold mb-8 text-cyan-400">Pedidos dos Clientes</h1>
      
      {pedidos.length === 0 ? (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-center">
          <p className="text-gray-400">Ainda não existem pedidos registados.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:border-purple-500 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {pedido.customer_name || "Cliente não identificado"}
                  </h2>
                  <p className="text-sm text-gray-400">Data: {new Date(pedido.created_at).toLocaleDateString('pt-BR')} às {new Date(pedido.created_at).toLocaleTimeString('pt-BR')}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-900 text-cyan-300 border border-cyan-700">
                  {pedido.status || "Pendente"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <h3 className="text-sm font-semibold text-purple-400 uppercase mb-2">Dados de Entrega</h3>
                  {/* Ajuste as variáveis de acordo com os nomes das colunas na sua base de dados */}
                  <p className="text-sm"><strong>Morada:</strong> {pedido.address || pedido.rua || "Não informada"}</p>
                  <p className="text-sm"><strong>Cidade:</strong> {pedido.city || pedido.cidade || "N/A"} - {pedido.state || pedido.estado || "N/A"}</p>
                  <p className="text-sm"><strong>Código Postal:</strong> {pedido.zip || pedido.cep || "N/A"}</p>
                  <p className="text-sm mt-2"><strong>Telefone:</strong> {pedido.phone || pedido.telefone || "Não informado"}</p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 flex flex-col justify-center items-start">
                  <h3 className="text-sm font-semibold text-purple-400 uppercase mb-2">Resumo Financeiro</h3>
                  <p className="text-2xl font-bold text-green-400">
                    R$ {Number(pedido.total_amount || pedido.total || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">ID do Pedido: {pedido.id}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}