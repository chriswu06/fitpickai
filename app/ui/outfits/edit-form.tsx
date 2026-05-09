"use client";

import { Outfit } from '@/app/lib/definitions'
import { Button } from '@/app/ui/button';
import { updateOutfit, OutfitState } from '@/app/lib/actions';
import { useActionState, useState, useEffect, useRef } from 'react';

const captureSteps = [
    { key: 'shirtImageUrl', label: 'Take a photo of your shirt.' },
    { key: 'pantsImageUrl', label: 'Take a photo of your pants or shorts.' },
    { key: 'shoesImageUrl', label: 'Take a photo of your shoes.' },
];

export default function EditOutfitForm({ outfit }: { outfit: Outfit }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const initialState: OutfitState = { message: '', errors: {} };
    const updateOutfitWithId = updateOutfit.bind(null, outfit.id);
    const [state, formAction] = useActionState(updateOutfitWithId, initialState);

    const [step, setStep] = useState(0);
        const [captures, setCaptures] = useState<Record<string, string | null>>({
            shirtImageUrl: outfit.shirt_image_url ?? null,
            pantsImageUrl: outfit.pants_image_url ?? null,
            shoesImageUrl: outfit.shoes_image_url ?? null,
        });

        const [rotationStatus, setRotationStatus] = useState<string>(
            outfit.rotation_status ? 'In rotation' : 'Out of rotation'
        );
    const [name, setName] = useState<string>(outfit.name ?? '');

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (error) {
                console.error('Camera access denied: ', error);
                return;
            }
        };

        if (step < 3) startCamera();
    }, [step]);

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL('image/png');
        const currentKey = captureSteps[step].key;
        setCaptures((prev) => ({ ...prev, [currentKey]: photoData }));
    };

    const nextStep = () => {
        if (step < captureSteps.length - 1) {
            setStep((s) => s + 1);
        } else {
            // move to final review step
            setStep(3);
        }
    };
    const prevStep = () => {
        if (step > 0) setStep((s) => s - 1);
    };

    const submit = (formData: FormData) => {
        Object.entries(captures).forEach(([keyframes, val]) => {
            if (val) formData.append(keyframes, val as string);
        });
        formAction(formData);
    };

    const current = captureSteps[step] ?? null;
    const currentImg = current ? captures[current.key] : null;

    return (
        <form action={submit} className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold">Editing {outfit.name}</h2>

            {step < 3 && current && (
                <>
                    <h3 className="text-lg font-medium">{current.label}</h3>
                    <video ref={videoRef} autoPlay className="w-64 rounded-lg shadow-md" />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex gap-2">
                        <Button type="button" onClick={capturePhoto}>
                            Capture
                        </Button>
                        {currentImg && (
                            <Button type="button" onClick={nextStep}>
                                {step === 2 ? 'Finalize' : 'Next'}
                            </Button>
                        )}
                        {step > 0 && (
                            <Button type="button" onClick={prevStep}>
                                Back
                            </Button>
                        )}
                    </div>

                    {currentImg && (
                        <div className="mt-2">
                            <p className="text-sm text-gray-600">Preview:</p>
                            <img src={currentImg} alt="preview" className="w-64 rounded-lg shadow" />
                        </div>
                    )}
                </>
            )}

            {step === 3 && (
                <div className="mt-6 flex flex-col gap-4 w-full max-w-sm">
                    <h3 className="text-md font-medium">Update your outfit details</h3>
                    <label className="block text-sm font-medium">Outfit Name</label>
                    <input
                        type="text"
                        name="name"
                        value={name}
                        className="border rounded p-2"
                        placeholder="Name your outfit (Optional)"
                        onChange={(e) => setName(e.target.value)}
                    />

                    <div className="flex flex-col gap-2">
                        <img src={captures.shirtImageUrl ?? ''} alt="shirt" className="rounded-lg shadow" />
                        <img src={captures.pantsImageUrl ?? ''} alt="pants" className="rounded-lg shadow" />
                        <img src={captures.shoesImageUrl ?? ''} alt="shoes" className="rounded-lg shadow" />
                    </div>

                    <label className="block text-sm font-medium">Personal rating</label>
                    <select name="personalRating" className="border rounded-md p-2">
                        <option value="">Select rating</option>
                        {Array.from({ length: 11 }, (_, i) => (
                            <option key={i} value={i}>
                                {i}
                            </option>
                        ))}
                    </select>

                    <label className="block text-sm font-medium">Rotation Status</label>
                    <select
                        name="rotationStatus"
                        value={rotationStatus}
                        onChange={(e) => setRotationStatus(e.target.value)}
                        className="border rounded p-2"
                    >
                        <option value="In rotation">In rotation</option>
                        <option value="Out of rotation">Out of rotation</option>
                    </select>

                    <div className="flex justify-between mt-4">
                        <Button type="button" onClick={prevStep}>
                            Back
                        </Button>
                        <Button type="submit">Update Outfit</Button>
                    </div>
                </div>
            )}

            <div id="customer-error" aria-live="polite" aria-atomic="true">
                {state?.errors && (
                    <p className="mt-2 text-sm text-red-500">{state?.message}</p>
                )}
            </div>
        </form>
    );
}