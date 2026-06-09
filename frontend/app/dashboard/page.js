'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import AppLayout from '../../components/layout/AppLayout';
import KpiCard from '../../components/ui/KpiCard';
import Spinner from '../../components/ui/Spinner';
import api from '../../lib/api';
import { ShoppingCart, TrendingUp, Star, Users, AlertTriangle, Target, Coffee, DollarSign } from 'lucide-react';

const GS = (n) => `Gs. ${Math.round(n || 0).toLocaleString('es-PY')}`;
const COLORES = ['#4a2c2a', '#a0522d', '#c0834a', '#d4a574', '#e8c9a0'];

export default function DashboardPage() {
  const [kpis, setKpis]       = useState(null);
  const [comp, setComp]       = useState(null);
  const [horas, setHoras]     = useState([]);
  const [top, setTop]         = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/financiero/dashboard'),
      api.get('/ventas/comparacion'),
      api.get('/ventas/horas-pico?dias=7'),
      api.get('/productos/ranking/top?limite=5'),
    ]).then(([k, c, h, t]) => {
      setKpis(k.data.kpis);
      setComp(c.data);
      setHoras(h.data.horasPico || []);
      setTop(t.data.top || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout><div className="p-8"><Spinner size="lg" /></div></AppLayout>;

  const semanalData = comp ? [
    { name: 'Sem. anterior', ventas: comp.semanal.semanaAnterior.total },
    { name: 'Esta semana',   ventas: comp.semanal.estaSemana.total },
  ] : [];

  const canalesData = [
    { name: 'Mostrador', value: 65 },
    { name: 'Delivery',  value: 25 },
    { name: 'Online',    value: 10 },
  ];

  const tooltipStyle = { background: '#4a2c2a', border: 'none', borderRadius: 10, color: '#fdf6f0', fontSize: 12 };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-cafe-900">Dashboard</h1>
            <p className="text-cafe-500 text-sm mt-0.5">
              {new Date().toLocaleDateString('es-PY', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-semibold">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Sistema activo
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Ventas hoy"      valor={GS(kpis?.ventasHoy?.total)}    sub={`${kpis?.ventasHoy?.cantidad||0} transacciones`}   icono={<ShoppingCart size={20}/>}   color="cafe"    delay={0} />
          <KpiCard label="Ventas del mes"  valor={GS(kpis?.ventasMes?.total)}    sub={`${kpis?.ventasMes?.cantidad||0} transacciones`}    icono={<DollarSign size={20}/>}    color="verde"   delay={0.05} />
          <KpiCard label="Ganancia mes"    valor={GS(kpis?.ventasMes?.ganancia)} sub="Utilidad neta"                                      icono={<TrendingUp size={20}/>}    color="naranja"  delay={0.1} />
          <KpiCard label="Ticket promedio" valor={GS(kpis?.ticketPromedio)}      sub="Por venta este mes"                                 icono={<Coffee size={20}/>}        color="cafe"    delay={0.15} />
          <KpiCard label="Producto estrella" valor={kpis?.productoEstrella?.nombre||'—'} sub={kpis?.productoEstrella?`${kpis.productoEstrella.unidadesVendidas} uds`:'Sin datos'} icono={<Star size={20}/>} color="naranja" delay={0.2} />
          <KpiCard label="Cliente top"     valor={kpis?.clienteFrecuente?.nombre||'—'} sub={kpis?.clienteFrecuente?GS(kpis.clienteFrecuente.totalGastado):'Sin datos'} icono={<Users size={20}/>} color="verde" delay={0.25} />
          <KpiCard label="Meta del mes"    valor={kpis?.meta?`${kpis.meta.porcentajeCumplido}%`:'—'} sub={kpis?.meta?GS(kpis.meta.metaVentas)+' objetivo':'Sin meta'} icono={<Target size={20}/>} color="cafe" delay={0.3} />
          <KpiCard label="Stock crítico"   valor={kpis?.stockCritico||0}         sub="Insumos bajo mínimo"                                icono={<AlertTriangle size={20}/>} color={kpis?.stockCritico>0?'rojo':'verde'} delay={0.35} />
        </div>

        {/* Meta progress */}
        {kpis?.meta && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.4}} className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-cafe-800">Progreso de Meta Mensual</h3>
                <p className="text-sm text-cafe-500">{GS(kpis.ventasMes?.total)} de {GS(kpis.meta.metaVentas)}</p>
              </div>
              <span className={`text-2xl font-display font-bold ${parseFloat(kpis.meta.porcentajeCumplido)>=100?'text-green-600':'text-cafe-700'}`}>
                {kpis.meta.porcentajeCumplido}%
              </span>
            </div>
            <div className="w-full h-3 bg-crema-200 rounded-full overflow-hidden">
              <motion.div
                initial={{width:0}}
                animate={{width:`${Math.min(parseFloat(kpis.meta.porcentajeCumplido),100)}%`}}
                transition={{delay:0.5,duration:0.8,ease:'easeOut'}}
                className="h-full rounded-full bg-cafe-500"
              />
            </div>
          </motion.div>
        )}

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.45}} className="card lg:col-span-2">
            <h3 className="font-semibold text-cafe-800 mb-4">Horas Pico — Últimos 7 días</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={horas}>
                <defs>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a0522d" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a0522d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5e6d3"/>
                <XAxis dataKey="hora" tick={{fontSize:10,fill:'#a0522d'}} interval={3} tickLine={false} axisLine={false}/>
                <YAxis tick={{fontSize:10,fill:'#a0522d'}} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={tooltipStyle} formatter={(v)=>[v,'Ventas']}/>
                <Area type="monotone" dataKey="ventas" stroke="#a0522d" strokeWidth={2} fill="url(#gc)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.5}} className="card">
            <h3 className="font-semibold text-cafe-800 mb-4">Ventas por Canal</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={canalesData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {canalesData.map((_,i)=><Cell key={i} fill={COLORES[i]}/>)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v)=>[`${v}%`,'']}/>
                <Legend formatter={(v)=><span className="text-xs text-cafe-600">{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.55}} className="card">
            <h3 className="font-semibold text-cafe-800 mb-4">Top 5 Productos</h3>
            {top.length===0 ? (
              <p className="text-cafe-400 text-sm text-center py-8">Registrá ventas para ver el ranking</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={top} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5e6d3" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:10,fill:'#a0522d'}} tickLine={false} axisLine={false}/>
                  <YAxis type="category" dataKey="nombre" tick={{fontSize:10,fill:'#4a2c2a'}} tickLine={false} axisLine={false} width={110}/>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v)=>[v,'Unidades']}/>
                  <Bar dataKey="totalVendido" fill="#a0522d" radius={[0,6,6,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.6}} className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-cafe-800">Comparación Semanal</h3>
              {comp && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                  ${comp.semanal.tendencia==='positiva'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                  {comp.semanal.tendencia==='positiva'?'↑':'↓'} {comp.semanal.crecimiento}%
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={semanalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5e6d3"/>
                <XAxis dataKey="name" tick={{fontSize:11,fill:'#a0522d'}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fontSize:10,fill:'#a0522d'}} tickLine={false} axisLine={false} tickFormatter={(v)=>`${(v/1000).toFixed(0)}K`}/>
                <Tooltip contentStyle={tooltipStyle} formatter={(v)=>[GS(v),'Ventas']}/>
                <Bar dataKey="ventas" fill="#4a2c2a" radius={[8,8,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

      </div>
    </AppLayout>
  );
}
