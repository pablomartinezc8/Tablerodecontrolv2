import React, { useState, useEffect } from 'react';
import { KnowledgeBaseItem, UserRole } from '../types';
import { getKnowledgeBase, saveKnowledgeBase, restoreKnowledgeBaseDefaults } from '../utils/storage';
import { 
  BookOpen, Search, PlusCircle, Trash2, Edit2, Check, X, FileText, HelpCircle, 
  Settings, Award, HelpCircle as FaqIcon, AlertCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface KnowledgeBaseProps {
  currentUserRole: UserRole;
}

const CATEGORIES = [
  'General',
  'Manuales de Uso',
  'Preguntas Frecuentes',
  'Procedimientos Internos',
  'Reglas de Negocio',
  'Instrucciones de Trabajo'
];

export default function KnowledgeBase({ currentUserRole }: KnowledgeBaseProps) {
  const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [formTitulo, setFormTitulo] = useState('');
  const [formCategoria, setFormCategoria] = useState(CATEGORIES[0]);
  const [formContenido, setFormContenido] = useState('');
  const [formError, setFormError] = useState('');

  const isReadOnly = currentUserRole === 'Cliente';

  // Load knowledge base
  useEffect(() => {
    setItems(getKnowledgeBase());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTitulo.trim()) {
      setFormError('El título es obligatorio.');
      return;
    }
    if (!formContenido.trim()) {
      setFormError('El contenido es obligatorio.');
      return;
    }

    let updatedItems: KnowledgeBaseItem[] = [];

    if (currentItemId) {
      // Edit mode
      updatedItems = items.map(item => 
        item.id === currentItemId 
          ? { 
              ...item, 
              titulo: formTitulo.trim(), 
              categoria: formCategoria, 
              contenido: formContenido.trim() 
            } 
          : item
      );
    } else {
      // Create mode
      const newItem: KnowledgeBaseItem = {
        id: `kb-${Date.now()}`,
        titulo: formTitulo.trim(),
        categoria: formCategoria,
        contenido: formContenido.trim(),
        fechaCreacion: new Date().toISOString().split('T')[0]
      };
      updatedItems = [...items, newItem];
    }

    setItems(updatedItems);
    saveKnowledgeBase(updatedItems);
    resetForm();
  };

  const handleEdit = (item: KnowledgeBaseItem) => {
    if (isReadOnly) return;
    setCurrentItemId(item.id);
    setFormTitulo(item.titulo);
    setFormCategoria(item.categoria);
    setFormContenido(item.contenido);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) return;
    if (confirm('¿Está seguro de que desea eliminar este artículo de la base de conocimiento?')) {
      const updated = items.filter(item => item.id !== id);
      setItems(updated);
      saveKnowledgeBase(updated);
      if (currentItemId === id) {
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentItemId(null);
    setFormTitulo('');
    setFormCategoria(CATEGORIES[0]);
    setFormContenido('');
    setFormError('');
  };

  const handleRestoreDefaults = async () => {
    if (confirm('¿Desea restaurar los artículos predeterminados? Esto reiniciará la base de conocimiento.')) {
      await restoreKnowledgeBaseDefaults();
      // Re-trigger load
      window.location.reload();
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contenido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || item.categoria === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'General': return BookOpen;
      case 'Manuales de Uso': return FileText;
      case 'Preguntas Frecuentes': return HelpCircle;
      case 'Procedimientos Internos': return Settings;
      case 'Reglas de Negocio': return Award;
      default: return FileText;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and introduction */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <h3 className="text-lg font-black tracking-tight text-white">Administración de Base de Conocimiento</h3>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Cargue y organice manuales, procedimientos, respuestas frecuentes e información general. 
            El Asistente de Inteligencia Artificial (Chatbot) utilizará toda esta información en tiempo real para instruir y guiar a los usuarios.
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleRestoreDefaults}
            className="self-start md:self-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 text-xs border border-slate-700 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reiniciar Valores</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Management / Editor Form */}
        {!isReadOnly && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 h-fit">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center space-x-2">
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>{currentItemId ? 'Editar Artículo' : 'Nuevo Artículo de Conocimiento'}</span>
            </h4>
            
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center space-x-1.5 border border-red-150">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Título / Pregunta *</label>
                <input
                  type="text"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ej: ¿Cómo se registran los costos indirectos?"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-semibold focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Categoría / Tema *</label>
                <select
                  value={formCategoria}
                  onChange={(e) => setFormCategoria(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold focus:border-indigo-500 focus:bg-white transition"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Contenido / Respuesta o Detalle *</label>
                <textarea
                  rows={6}
                  value={formContenido}
                  onChange={(e) => setFormContenido(e.target.value)}
                  placeholder="Escriba el procedimiento detallado, respuesta frecuente o instrucción..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 resize-none font-sans focus:border-indigo-500 focus:bg-white transition leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>{currentItemId ? 'Actualizar Artículo' : 'Guardar Artículo'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Right Column (takes 2 cols if editing is visible): Knowledge Search & Explorer */}
        <div className={`space-y-4 ${isReadOnly ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          
          {/* Filters & Search Row */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar en el conocimiento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-250 rounded-xl py-2 pl-9 pr-4 outline-none text-xs text-slate-800 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === 'All' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    selectedCategory === cat 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* List of articles */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl p-6">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-600">No se encontraron artículos</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Intente cambiando los términos de búsqueda o agregue nuevos registros.
                </p>
              </div>
            ) : (
              filteredItems.map(item => {
                const Icon = getCategoryIcon(item.categoria);
                return (
                  <div 
                    key={item.id} 
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider border border-slate-200">
                              {item.categoria}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              Creado: {item.fechaCreacion}
                            </span>
                          </div>
                          <h5 className="font-extrabold text-slate-800 text-sm leading-snug">
                            {item.titulo}
                          </h5>
                          <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed pt-2">
                            {item.contenido}
                          </p>
                        </div>
                      </div>

                      {/* Item Actions (Only for Empresa / non-Cliente) */}
                      {!isReadOnly && (
                        <div className="flex items-center space-x-1 shrink-0 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition"
                            title="Editar artículo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 hover:bg-rose-50 text-slate-450 hover:text-rose-600 rounded-lg transition"
                            title="Eliminar artículo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="p-3 bg-indigo-50/50 rounded-xl text-[10px] text-indigo-800 border border-indigo-100 flex items-start space-x-2">
            <FaqIcon className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Nota sobre Sincronización Inteligente:</strong> El chatbot está conectado directamente con esta Base de Datos local. Cualquier artículo que agregue, edite o elimine será asimilado por la Inteligencia Artificial instantáneamente para responder futuras preguntas de los usuarios.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
