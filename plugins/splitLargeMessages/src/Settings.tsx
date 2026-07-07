import { storage } from "@vendetta/plugin";
import { General } from "@vendetta/ui/components";

const { Forms } = General;
const { FormSection, FormSwitchRow, FormInput } = Forms;

export function Settings() {
    return (
        <FormSection title="SplitLargeMessages">
            <FormInput
                title="Maximo de caracteres por mensaje"
                value={String(storage.maxLength)}
                onChange={(v: string) => { storage.maxLength = Number(v) || 2000; }}
            />
            <FormSwitchRow
                label="Dividir por saltos de linea en vez de espacios"
                value={!!storage.byNewlines}
                onValueChange={(v: boolean) => { storage.byNewlines = v; }}
            />
            <FormInput
                title="Retraso entre mensajes (ms)"
                value={String(storage.delayMs)}
                onChange={(v: string) => { storage.delayMs = Number(v) || 750; }}
            />
        </FormSection>
    );
}
