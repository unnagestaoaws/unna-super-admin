import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PanoramaAssinaturas } from '@/services/super-admin.service';
import { formatarData, ROTULO_SITUACAO, SERIE_PAGANTES } from './situacao-rotulos';

interface Props {
  serie: PanoramaAssinaturas['serie'];
  historicoDesde: string | null;
}

const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

/** Pagantes por dia, a partir da foto diária. Não há passado: a curva começa na primeira foto. */
const SeriePagantes = ({ serie, historicoDesde }: Props) => (
  <section className="bg-white rounded-xl shadow-sm p-5">
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-base font-bold text-gray-800">Pagantes por dia</h2>
      {historicoDesde && (
        <p className="text-xs text-gray-500">Histórico desde {formatarData(`${historicoDesde}T12:00:00Z`)}</p>
      )}
    </div>
    {serie.length < 2 ? (
      <p className="py-10 text-center text-sm text-gray-500">
        A foto diária começa hoje; a curva aparece a partir de amanhã.
      </p>
    ) : (
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="data" tickFormatter={diaCurto} axisLine={false} tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }} minTickGap={30} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(d: any) => diaCurto(String(d))}
              formatter={(v: any, chave: any) => [v, ROTULO_SITUACAO[chave as keyof typeof ROTULO_SITUACAO] ?? chave]}
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }}
            />
            <Legend formatter={(chave: any) => ROTULO_SITUACAO[chave as keyof typeof ROTULO_SITUACAO] ?? chave}
              wrapperStyle={{ fontSize: 12 }} />
            {SERIE_PAGANTES.map((s) => (
              <Area key={s.chave} type="monotone" dataKey={s.chave} stackId="pagantes"
                stroke={s.cor} strokeWidth={2} fill={s.cor} fillOpacity={0.15} isAnimationActive={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}
  </section>
);

export default SeriePagantes;
