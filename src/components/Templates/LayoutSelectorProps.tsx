import { useState } from 'react';
import { Grid, ChevronDown, Check } from 'lucide-react';

interface LayoutSelectorProps {
    templates: any[];
    selectedTemplate: string;
    onSelectTemplate: (templateId: string) => void;
}

export const LayoutSelector = ({ 
    templates, 
    selectedTemplate, 
    onSelectTemplate 
}: LayoutSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
    
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
                <Grid className="h-4 w-4" />
                <span className="text-sm">
                    {selectedTemplateData?.icon} {selectedTemplateData?.name || 'Layout'}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Dropdown */}
                    <div className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 min-w-[280px]">
                        <div className="p-2">
                            <div className="text-xs text-gray-400 px-2 py-1 mb-1">
                                Choose Layout Template
                            </div>
                            {templates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => {
                                        onSelectTemplate(template.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 ${
                                        selectedTemplate === template.id
                                            ? 'bg-blue-600 text-white'
                                            : 'hover:bg-gray-700 text-gray-300'
                                    }`}
                                >
                                    <span className="text-lg">{template.icon}</span>
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">{template.name}</div>
                                        <div className="text-xs text-gray-400">{template.description}</div>
                                    </div>
                                    {selectedTemplate === template.id && (
                                        <Check className="h-4 w-4" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};