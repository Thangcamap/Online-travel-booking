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
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createProvider, uploadProviderImage, getProviderByUser } from "../api/create-provied";
import SearchLocation from "../../Location/components/SearchLocation";
import { createAddress } from "../../Location/api/address-api";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { socket } from "@/lib/socket";
import { toast } from "sonner";


// ✅ Validation schema
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
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [addressLine2, setAddressLine2] = useState("");
    const [contentState, setContentState] = useState("loading");
  

  

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUserStore();



  // ✅ Lấy trạng thái provider của user hiện tại
  const { data: providerData, isLoading: checkingProvider } = useQuery({
    queryKey: ["providerByUser", authUser?.user_id],
    queryFn: () => getProviderByUser(authUser.user_id),
    enabled: !!authUser?.user_id,
  });
    // ✅ Socket lắng nghe trạng thái user realtime
  useEffect(() => {
    if (!authUser?.user_id) return;

    socket.connect();
    socket.emit("join_user", authUser.user_id);
    console.log("✅ Joined socket room user_" + authUser.user_id);

socket.on("account_status_changed", (newStatus) => {
  toast.error(`Tài khoản của bạn đã bị ${newStatus}`);
  useAuthUserStore.getState().setAuthUser({
    ...authUser,
    status: newStatus,
  });
  localStorage.setItem("authUser", JSON.stringify({
    ...authUser,
    status: newStatus,
  }));
  if (newStatus !== "active") {
    setContentState("user_blocked");
  } else {
    setContentState("form");
  }
});
    

    return () => {
      socket.off("account_status_changed");
      socket.disconnect();
    };
  }, [authUser?.user_id]);

  // ✅ Xác định trạng thái hiển thị
useEffect(() => {
    if (checkingProvider) {
      setContentState("loading");
    } else if (authUser?.status && authUser.status !== "active") {
      setContentState("user_blocked");
    } else if (
      providerData?.exists &&
      providerData?.provider?.approval_status === "pending"
    )
      setContentState("pending");
    else if (
      providerData?.exists &&
      providerData?.provider?.status === "suspended"
    )
      setContentState("suspended");
    else if (
      providerData?.exists &&
      providerData?.provider?.approval_status === "approved"
    )
      setContentState("approved");
    else setContentState("form");
  }, [checkingProvider, providerData, authUser?.status]);

  // ✅ React Hook Form setup
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

  // ✅ Cleanup previews
  useEffect(() => {
    return () => {
      if (images.logo.preview) URL.revokeObjectURL(images.logo.preview);
      if (images.cover.preview) URL.revokeObjectURL(images.cover.preview);
    };
  }, [images.logo.preview, images.cover.preview]);

  // ✅ Mutation: Tạo provider
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
  onError: (error) => {
    // ✅ Kiểm tra lỗi trả về từ backend
    const msg = error.response?.data?.message || "Lỗi không xác định";
    const field = error.response?.data?.field;

    if (field && form.setError) {
      form.setError(field, { message: msg });
    } else {
      setMessageFile(msg);
    }
  },
});


  // ✅ Mutation: Upload ảnh
  const uploadImageMutation = useMutation({
    mutationFn: uploadProviderImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      setOpen(true);
    },
  });

  // ✅ Xử lý chọn ảnh
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

  // ✅ Submit handler
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
      const addrPayload = {
        address_line1: selectedPlace.formatted,
        address_line2: addressLine2 || null,
        city: selectedPlace.formatted,
        country: "Vietnam",
        latitude: selectedPlace.lat,
        longitude: selectedPlace.lon,
      };

      const addrRes = await createAddress(addrPayload);
      const address_id = addrRes.data?.address_id;
      if (!address_id) throw new Error("No address_id returned");

      const providerPayload = {
        user_id: authUser?.user_id,
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

  // ✅ Render
  return (
    <>
      {contentState === "loading" && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-600">
          <Loader2 className="animate-spin w-6 h-6 mb-2" />
          <p>Đang kiểm tra trạng thái đăng ký...</p>
        </div>
      )}

      {contentState === "pending" && (
        <div className="flex flex-col items-center justify-center h-80 space-y-4 text-center">
          <span className="text-5xl">⏳</span>
          <p className="text-lg font-semibold text-gray-800">
            Yêu cầu của bạn đang chờ Admin phê duyệt
          </p>
          <p className="text-sm text-gray-500">
            Vui lòng quay lại sau khi yêu cầu được chấp thuận.
          </p>
        </div>
      )}

      {contentState === "approved" && (
        <div className="text-center py-20 text-green-600 font-medium text-lg">
          ✅ Bạn đã là nhà cung cấp tour . Không cần đăng ký thêm.
        </div>
      )}
      {contentState === "suspended" && (
  <div className="flex flex-col items-center justify-center h-80 space-y-4 text-center text-red-600">
    <span className="text-5xl">🚫</span>
    <p className="text-lg font-semibold">
      Tài khoản nhà cung cấp của bạn đã bị khóa.
    </p>
    <p className="text-sm text-gray-500">
      Vui lòng liên hệ quản trị viên để được hỗ trợ khôi phục.
    </p>
  </div>
)}
{contentState === "user_blocked" && (
  <div className="flex flex-col items-center justify-center h-80 space-y-4 text-center text-red-600">
    <span className="text-5xl">🚫</span>
    <p className="text-lg font-semibold">
      Tài khoản người dùng của bạn đã bị khóa hoặc vô hiệu hóa.
    </p>
    <p className="text-sm text-gray-500">
      Vui lòng liên hệ quản trị viên để được hỗ trợ khôi phục quyền truy cập.
    </p>
  </div>
)}



      {contentState === "form" && (
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
                  onClick={() => navigate("/home")}
                  className="bg-orange-600 hover:bg-orange-700 w-full text-white rounded-lg"
                >
                  Quay lại trang quản lý
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* FORM */}
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

                    {/* Địa chỉ */}
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
      )}
    </>
  );
}
