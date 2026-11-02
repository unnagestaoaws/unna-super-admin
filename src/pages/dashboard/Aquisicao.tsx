import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PanoramaAssinaturas } from '@/services/super-admin.service';

interface Props {
  aquisicao: PanoramaAssinaturas['aquisicao'];
}

const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const ROTULO: Record<string, string> = { cadastros: 'Cadastros', viraramPagantes: 'Já pagaram' };

/** Cadastros do período e quantos deles já fizeram o primeiro pagamento. */
const Aquisicao = ({ aquisicao }: Props) => {
  const conversao = aquisicao.cadastros ? Math.round((aquisicao.viraramPagantes / aquisicao.cadastros) * 100) : 0;

  return (
    <section className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-gray-800">Aquisição</h2>
        <p className="text-sm text-gray-700">
          {aquisicao.cadastros} cadastros · {aquisicao.viraramPagantes} já pagaram · <strong>{conversao}%</strong>
        </p>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={aquisicao.porDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="data" tickFormatter={diaCurto} axisLine={false} tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }} minTickGap={30} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(d: any) => diaCurto(String(d))}
              formatter={(v: any, chave: any) => [v, ROTULO[chave] ?? chave]}
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }}
              cursor={{ fill: '#f8fafc' }}
            />
            <Legend formatter={(chave: any) => ROTULO[chave] ?? chave} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="cadastros" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="viraramPagantes" fill="#16a34a" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default Aquisicao;
