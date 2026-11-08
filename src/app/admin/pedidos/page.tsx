'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Usamos um fallback ('https://dummy.supabase.co' e 'dummy-key') para evitar o erro de prerender da Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any | null>(null);

  useEffect(() => {
    async function fetchPedidos() {
      // Se estiver rodando com o dummy falso do build, aborta a busca para não dar erro no console
      if (supabaseUrl === 'https://dummy.supabase.co') return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar pedidos:', error);
      } else {
        setPedidos(data || []);
      }
      setLoading(false);
    }

    fetchPedidos();
  }, []);

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const abrirWhatsApp = (telefone: string, nome: string) => {
    const numeroLimpo = telefone.replace(/\D/g, '');
    const mensagem = encodeURIComponent(`Olá ${nome}! Seu pedido na Mega Imports acabou de ser atualizado. Já estamos preparando o seu envio!`);
    window.open(`https://wa.me/55${numeroLimpo}?text=${mensagem}`, '_blank');
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 p-8 text-white flex items-center justify-center">Carregando pedidos da Mega Imports...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <h1 className="text-3xl font-bold mb-8">Pedidos dos Clientes</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {pedidos.map((pedido) => (
          <div
            key={pedido.id}
            onClick={() => setPedidoSelecionado(pedido)}
            className="bg-gray-800 border border-gray-700 rounded-lg p-6 cursor-pointer hover:bg-gray-700 hover:border-purple-500 transition-all shadow-lg flex flex-col justify-between"
          >
            <div>
              <h2 className="text-xl font-bold text-purple-400 capitalize">{pedido.customer_name}</h2>
              <p className="text-gray-400 text-sm mt-1">{formatarData(pedido.created_at)}</p>
              <p className="text-gray-300 font-semibold mt-2">R$ {pedido.total_amount.toFixed(2)}</p>
            </div>
            <div className="mt-4 text-sm text-purple-300 font-medium">
              Ver detalhes de entrega &rarr;
            </div>
          </div>
        ))}

        {pedidos.length === 0 && (
          <p className="text-gray-400">Nenhum pedido recebido ainda.</p>
        )}
      </div>

      {pedidoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full border border-gray-600 shadow-2xl relative">
            
            <button 
              onClick={() => setPedidoSelecionado(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <h3 className="text-2xl font-bold text-white capitalize mb-4">
              {pedidoSelecionado.customer_name}
            </h3>
            
            <div className="space-y-4 text-gray-300">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Endereço de Entrega</p>
                <p className="font-medium text-white">{pedidoSelecionado.shipping_address}, {pedidoSelecionado.shipping_number}</p>
                {pedidoSelecionado.shipping_neighborhood && <p>Bairro: {pedidoSelecionado.shipping_neighborhood}</p>}
                <p>{pedidoSelecionado.shipping_city} - {pedidoSelecionado.shipping_state}</p>
                <p>CEP: {pedidoSelecionado.shipping_cep}</p>
              </div>

              <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Contato</p>
                <p className="font-medium text-white">{pedidoSelecionado.customer_phone}</p>
                <p>{pedidoSelecionado.customer_email}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button 
                onClick={() => abrirWhatsApp(pedidoSelecionado.customer_phone, pedidoSelecionado.customer_name)}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 21a9.005 9.005 0 0 1-4.59-1.26l-.329-.195-3.411.895.912-3.328-.214-.34A8.995 8.995 0 0 1 3 12c0-4.962 4.038-9 9-9s9 4.038 9 9-4.038 9-9 9zm0-20C5.373 1 0 6.373 0 13c0 2.12.553 4.108 1.536 5.845L.25 24l5.289-1.385C7.234 23.473 9.537 24 12 24c6.627 0 12-5.373 12-12S18.627 1 12 1z"/></svg>
                Chamar no WhatsApp
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}