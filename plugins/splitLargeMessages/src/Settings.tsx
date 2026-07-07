import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage"; // Mantiene la UI sincronizada con el storage

// Extraemos los componentes de formulario estándar de Discord
const { FormSection, FormSwitchRow, FormInput } = findByProps("FormSection", "FormSwitchRow") || {};

export function Settings() {
    // Esto hace que React sepa cuándo cambia el storage y actualice la pantalla correctamente
    useProxy(storage);

    // Salvavidas por si Discord cambia los nombres de los componentes
    if (!FormSection || !FormSwitchRow || !FormInput) {
        return null; 
    }

    return (
        <FormSection title="SplitLargeMessages">
            <FormInput
                title="Máximo de caracteres por mensaje"
                value={String(storage.maxLength ?? 2000)}
                onChange={(v: string) => { 
                    storage.maxLength = Number(v) || 2000; 
                }}
            />
            <FormSwitchRow
                label="Dividir por saltos de línea en vez de espacios"
                value={!!storage.byNewlines}
                onValueChange={(v: boolean) => { 
                    storage.byNewlines = v; 
                }}
            />
            <FormInput
                title="Retraso entre mensajes (ms)"
                value={String(storage.delayMs ?? 750)}
                onChange={(v: string) => { 
                    storage.delayMs = Number(v) || 750; 
                }}
            />
        </FormSection>
    );
}
