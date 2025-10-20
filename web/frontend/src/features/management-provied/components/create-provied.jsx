import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, Building, Loader2 } from "lucide-react";
import { ImagePreview } from "@/components/ui/image-preview";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createProvider, uploadProviderImage } from "../api/create-provied";
import SearchLocation from "../../Location/components/SearchLocation";
import { createAddress } from "../../Location/api/address-api";

// Schema
const formSchema = z.object({
  companyName: z.string().min(3, { message: "Tên công ty phải có ít nhất 3 ký tự." }),
  phoneNumber: z
    .string()
    .min(10, { message: "Số điện thoại phải có ít nhất 10 chữ số." })
    .max(15)
    .regex(/^[0-9]+$/, { message: "Số điện thoại chỉ chứa các chữ số." }),
  email: z.string().email({ message: "Email không hợp lệ." }),
  description: z.string().optional(),
  terms: z.boolean().refine((val) => val === true, {
    message: "Bạn phải đồng ý với điều khoản sử dụng.",
  }),
});

export default function TourProviderForm() {
  const [open, setOpen] = useState(false);
  const [messageFile, setMessageFile] = useState(null);
  const [images, setImages] = useState({
    logo: { file: null, preview: null },
    cover: { file: null, preview: null },
  });

  // selectedPlace = { formatted, lat, lon } from SearchLocation
  const [selectedPlace, setSelectedPlace] = useState(null);
  // addressLine2 is the "địa chỉ bổ sung"
  const [addressLine2, setAddressLine2] = useState("");

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      phoneNumber: "",
      email: "",
      description: "",
      terms: false,
    },
  });

  // Cleanup previews
  useEffect(() => {
    return () => {
      if (images.logo.preview) URL.revokeObjectURL(images.logo.preview);
      if (images.cover.preview) URL.revokeObjectURL(images.cover.preview);
    };
  }, [images.logo.preview, images.cover.preview]);

  // create provider mutation
  const { mutate, isLoading } = useMutation({
    mutationFn: createProvider,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      const newProviderId = res.data?.provider_id;
      if (newProviderId && (images.logo.file || images.cover.file)) {
        uploadImageMutation.mutate({
          providerId: newProviderId,
          images: { logo: images.logo.file, cover: images.cover.file },
        });
      } else {
        setOpen(true);
      }
    },
    onError: () => {
      setMessageFile("Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.");
    },
  });

  // upload images
  const uploadImageMutation = useMutation({
    mutationFn: uploadProviderImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      setOpen(true);
    },
  });

  // handle image change
  const handleImageChange = useCallback((name, file) => {
    setImages((prev) => {
      if (prev[name]?.preview) URL.revokeObjectURL(prev[name].preview);
      if (file) {
        const previewUrl = URL.createObjectURL(file);
        return { ...prev, [name]: { file, preview: previewUrl } };
      }
      return { ...prev, [name]: { file: null, preview: null } };
    });
  }, []);

  // Submit flow:
  // 1) ensure logo & selectedPlace
  // 2) createAddress(...) -> get address_id
  // 3) createProvider(...) with address_id
  const onSubmit = async (values) => {
    setMessageFile(null);

    if (!images.logo.file) {
      setMessageFile("Logo công ty không được để trống.");
      return;
    }

    if (!selectedPlace) {
      setMessageFile("Vui lòng chọn địa chỉ từ danh sách gợi ý.");
      return;
    }

    try {
      // Create address in backend
      const addrPayload = {
        address_line1: selectedPlace.formatted,
        address_line2: addressLine2 || null,
        city: selectedPlace.formatted, // adjust if you have city separately
        country: "Vietnam", // or derive from selectedPlace if available
        latitude: selectedPlace.lat,
        longitude: selectedPlace.lon,
      };

      const addrRes = await createAddress(addrPayload);
      const address_id = addrRes.data?.address_id;

      if (!address_id) {
        throw new Error("No address_id returned");
      }

      // Create provider with returned address_id
      const providerPayload = {
        user_id: 1, // tạm thời — thay bằng user thực khi có auth
        company_name: values.companyName,
        description: values.description,
        email: values.email,
        phone_number: values.phoneNumber,
        address_id,
      };

      mutate(providerPayload);
    } catch (err) {
      console.error("Error creating address/provider:", err);
      setMessageFile("Lỗi khi lưu địa chỉ hoặc tạo provider. Vui lòng thử lại.");
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="border-orange-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600 text-center text-lg font-semibold">
              🎉 Gửi yêu cầu thành công!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-600">
              Cảm ơn bạn đã đăng ký! Chúng tôi sẽ xem xét và phản hồi sớm nhất.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => navigate("/d/providers")}
              className="bg-orange-600 hover:bg-orange-700 w-full text-white rounded-lg"
            >
              Quay lại trang quản lý
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-orange-600">Đăng ký nhà cung cấp tour</h1>
          <p className="text-gray-600 text-sm">
            Vui lòng điền thông tin bên dưới để hoàn tất quá trình đăng ký hợp tác.
          </p>
        </div>

        <Card className="border-2 border-orange-100 shadow-md rounded-2xl">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-t-2xl border-b border-orange-100">
            <CardTitle className="text-orange-600 text-lg font-semibold">Thông tin công ty</CardTitle>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="flex md:block flex-col gap-2 relative">
              <div className="md:absolute z-10 right-5 mx-auto bottom-10 md:translate-y-1/2">
                <ImagePreview
                  name="logo"
                  value={images.logo.preview}
                  onChange={handleImageChange}
                  aspectRatio="avatar"
                  className="md:max-w-40 max-w-24"
                />
              </div>
              <ImagePreview
                name="cover"
                value={images.cover.preview}
                onChange={handleImageChange}
                className="max-w-full"
                aspectRatio="cover"
              />
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-gray-700">Tên công ty *</FormLabel>
                      <div className="relative">
                        <Building className="absolute left-3 top-3 text-orange-400 w-5 h-5" />
                        <Input {...field} placeholder="VD: Công ty du lịch ABC" className="pl-10 rounded-xl" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-gray-700">Email *</FormLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 text-orange-400 w-5 h-5" />
                        <Input {...field} type="email" placeholder="example@company.com" className="pl-10 rounded-xl" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-gray-700">Số điện thoại *</FormLabel>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 text-orange-400 w-5 h-5" />
                        <Input {...field} placeholder="0123456789" className="pl-10 rounded-xl" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address selection + addressLine2 */}
                <div>
                  <FormLabel className="font-medium text-gray-700">Địa chỉ *</FormLabel>
                  <SearchLocation value={selectedPlace} onChange={setSelectedPlace} />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-gray-700">Mô tả công ty</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Giới thiệu ngắn gọn..." rows={4} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 p-3 border border-orange-100 bg-orange-50/50 rounded-xl">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-orange-400" />
                      </FormControl>
                      <FormLabel className="text-gray-600 text-sm cursor-pointer">
                        Tôi đồng ý với{" "}
                        <a href="/terms" className="text-orange-600 hover:text-orange-700 underline font-medium">
                          điều khoản sử dụng
                        </a>{" "}
                        của hệ thống.
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {messageFile && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    {messageFile}
                  </div>
                )}

                <Button type="submit" disabled={isSubmitting || isLoading} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  {isSubmitting || isLoading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-5 w-5" />
                      Đang gửi...
                    </>
                  ) : (
                    "Gửi yêu cầu đăng ký"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
