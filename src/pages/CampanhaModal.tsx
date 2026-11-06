import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Combobox } from '@/components/ui/combobox';
import { Building2, Calendar, Link as LinkIcon, Image as ImageIcon, FileText, Type } from 'lucide-react';
import { campanhaService, Campanha } from '@/services/campanha.service';
import { empresaService, Empresa } from '@/services/empresa.service';

interface CampanhaModalProps {
    isOpen: boolean;
    onClose: () => void;
    campanha?: Campanha;
    onSuccess: () => void;
}

const CampanhaModal: React.FC<CampanhaModalProps> = ({ isOpen, onClose, campanha, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);

    const [formData, setFormData] = useState({
        titulo: '',
        descricao: '',
        imagem_url: '',
        link_url: '',
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tipo: 'FLUTUANTE' as 'FLUTUANTE' | 'FLUTUANTE_9_16' | 'FIXA_MENU',
        empresaId: '' as string | undefined,
        ativo: true
    });

    useEffect(() => {
        if (isOpen) {
            loadEmpresas();
            if (campanha) {
                setFormData({
                    titulo: campanha.titulo,
                    descricao: campanha.descricao || '',
                    imagem_url: campanha.imagem_url,
                    link_url: campanha.link_url || '',
                    data_inicio: (campanha as any).data_inicio?.split('T')[0] || new Date().toISOString().split('T')[0],
                    data_fim: (campanha as any).data_fim?.split('T')[0] || new Date().toISOString().split('T')[0],
                    tipo: campanha.tipo,
                    empresaId: campanha.empresaId || '',
                    ativo: (campanha as any).ativo ?? true
                });
            } else {
                setFormData({
                    titulo: '',
                    descricao: '',
                    imagem_url: '',
                    link_url: '',
                    data_inicio: new Date().toISOString().split('T')[0],
                    data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    tipo: 'FLUTUANTE',
                    empresaId: '',
                    ativo: true
                });
            }
        }
    }, [isOpen, campanha]);

    const empresaOptions = useMemo(() => [
        { value: '', label: 'Global (Todas as empresas)' },
        ...empresas.map(empresa => ({ value: empresa.id, label: empresa.nome_negocio }))
    ], [empresas]);

    const loadEmpresas = async () => {
        try {
            setEmpresas(await empresaService.getTodasEmpresas());
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const data = {
            ...formData,
            empresaId: formData.empresaId === '' ? undefined : formData.empresaId,
            data_inicio: new Date(formData.data_inicio).toISOString(),
            data_fim: new Date(formData.data_fim).toISOString(),
        };

        try {
            if (campanha) {
                await campanhaService.update(campanha.id, data);
            } else {
                await campanhaService.create(data);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Erro ao salvar campanha:', error);
            setError(error.message || 'Erro ao salvar campanha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={campanha ? 'Editar Campanha' : 'Nova Campanha'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Type size={14} className="text-gray-400" />
                            Título *
                        </label>
                        <Input
                            value={formData.titulo}
                            onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                            placeholder="Ex: Black Friday"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <FileText size={14} className="text-gray-400" />
                            Tipo *
                        </label>
                        <select
                            value={formData.tipo}
                            onChange={e => setFormData(prev => ({ ...prev, tipo: e.target.value as any }))}
                            className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                            <option value="FLUTUANTE">Flutuante (16:9)</option>
                            <option value="FLUTUANTE_9_16">Flutuante (9:16)</option>
                            <option value="FIXA_MENU">Sidebar (4:3)</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição</label>
                    <Input
                        value={formData.descricao}
                        onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Uma breve descrição da campanha"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <ImageIcon size={14} className="text-gray-400" />
                            URL da Imagem *
                        </label>
                        <Input
                            value={formData.imagem_url}
                            onChange={e => setFormData(prev => ({ ...prev, imagem_url: e.target.value }))}
                            placeholder="https://exemplo.com/banner.jpg"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <LinkIcon size={14} className="text-gray-400" />
                            URL de Destino
                        </label>
                        <Input
                            value={formData.link_url}
                            onChange={e => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                            placeholder="https://exemplo.com/promocao"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            Data Início *
                        </label>
                        <Input
                            type="date"
                            value={formData.data_inicio}
                            onChange={e => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            Data Fim *
                        </label>
                        <Input
                            type="date"
                            value={formData.data_fim}
                            onChange={e => setFormData(prev => ({ ...prev, data_fim: e.target.value }))}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Building2 size={14} className="text-gray-400" />
                        Empresa (Opcional - deixe vazio para Global)
                    </label>
                    <Combobox
                        options={empresaOptions}
                        value={formData.empresaId}
                        onChange={(v) => setFormData(prev => ({ ...prev, empresaId: v }))}
                        placeholder="Global (Todas as empresas)"
                        emptyText="Nenhuma empresa encontrada."
                        className="h-10"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="ativo"
                        checked={formData.ativo}
                        onChange={e => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="ativo" className="text-sm font-medium">Campanha Ativa</label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" type="button" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-white">
                        {loading ? 'Salvando...' : (campanha ? 'Atualizar' : 'Criar')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default CampanhaModal;
